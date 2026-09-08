'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  User,
  Building2,
  Users,
  CreditCard,
  Check,
  Lock,
  Loader2,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { isDemoSession } from '@/services/api';
import { useCompany } from '@/app/context/CompanyContext';
import { isDemoEntityId } from '@/lib/config/demo-policy';
import {
  billingApi,
  DEMO_BILLING_PLANS,
  getDemoBillingEntitlements,
  type BillingEntitlementsResponse,
  type BillingFeature,
  type BillingPlan,
  type PlanLevel,
} from '@/lib/api/billing';
import {
  paymentsApi,
  type PaymentSubscriptionResponse,
  type PaymentSubscriptionStatus,
  type PaymentWebhookDeliveryStatus,
  type PaymentWebhookEvent,
} from '@/lib/api/payments';

type ApiErrorLike = {
  response?: { data?: { message?: string } };
  message?: string;
};

type SectionKey = 'profile' | 'company' | 'users' | 'billing';

const SECTIONS: { key: SectionKey; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Perfil', icon: User },
  { key: 'company', label: 'Empresa', icon: Building2 },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'billing', label: 'Plano e Cobrança', icon: CreditCard },
];

const PLAN_ORDER: Record<PlanLevel, number> = { FREE: 1, PRO: 2, ENTERPRISE: 3 };
const BILLABLE_SUBSCRIPTION_STATUSES = new Set<PaymentSubscriptionStatus>([
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
]);
const WEBHOOK_STATUS_OPTIONS: Array<PaymentWebhookDeliveryStatus | 'ALL'> = [
  'ALL',
  'FAILED',
  'RECEIVED',
  'PROCESSED',
  'IGNORED',
];

function formatLimit(value: number): string {
  if (value >= 999999) return 'Ilimitado';
  if (value >= 999) return 'Ilimitado';
  return value.toLocaleString('pt-BR');
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Pendente';
  return new Date(value).toLocaleString('pt-BR');
}

function webhookStatusLabel(status: PaymentWebhookDeliveryStatus): string {
  const labels: Record<PaymentWebhookDeliveryStatus, string> = {
    RECEIVED: 'Recebido',
    PROCESSED: 'Processado',
    IGNORED: 'Ignorado',
    FAILED: 'Falhou',
  };

  return labels[status];
}

function webhookStatusClass(status: PaymentWebhookDeliveryStatus): string {
  const classes: Record<PaymentWebhookDeliveryStatus, string> = {
    RECEIVED: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    PROCESSED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    IGNORED: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    FAILED: 'border-red-500/30 bg-red-500/10 text-red-300',
  };

  return classes[status];
}

function hasBillableSubscription(
  subscription: PaymentSubscriptionResponse['subscription'],
): boolean {
  return Boolean(subscription?.status && BILLABLE_SUBSCRIPTION_STATUSES.has(subscription.status));
}

// ─────────────────────────────────────────────────────────────────────────
// Seção: Plano e Cobrança
// ─────────────────────────────────────────────────────────────────────────

function BillingSection() {
  const { selectedCompany } = useCompany();
  const isDemoBillingContext = Boolean(
    selectedCompany?.id && isDemoSession() && isDemoEntityId(selectedCompany.id),
  );
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [entitlements, setEntitlements] = useState<BillingEntitlementsResponse | null>(null);
  const [subscription, setSubscription] =
    useState<PaymentSubscriptionResponse['subscription']>(null);
  const [paymentEvents, setPaymentEvents] = useState<PaymentWebhookEvent[]>([]);
  const [webhookStatusFilter, setWebhookStatusFilter] =
    useState<PaymentWebhookDeliveryStatus | 'ALL'>('FAILED');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<PlanLevel | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedCompany?.id) return;
    setLoading(true);
    setError(null);
    try {
      if (isDemoBillingContext) {
        setPlans(DEMO_BILLING_PLANS);
        setEntitlements(getDemoBillingEntitlements(selectedCompany));
        setSubscription(null);
        setPaymentEvents([]);
        return;
      }

      const [plansRes, entitlementsRes, subscriptionRes] = await Promise.all([
        billingApi.plans(),
        billingApi.entitlements(selectedCompany.id),
        paymentsApi.subscription(selectedCompany.id),
      ]);
      setPlans(plansRes.plans ?? []);
      setEntitlements(entitlementsRes ?? null);
      setSubscription(subscriptionRes.subscription ?? null);

      paymentsApi
        .webhookEvents(selectedCompany.id, {
          status: webhookStatusFilter === 'ALL' ? undefined : webhookStatusFilter,
          limit: 25,
        })
        .then((eventsRes) => setPaymentEvents(eventsRes.events ?? []))
        .catch((eventErr: unknown) => {
          console.warn('[Settings/Billing] webhook audit unavailable:', eventErr);
          setPaymentEvents([]);
        });
    } catch (err) {
      console.error('[Settings/Billing] load failed:', err);
      if (isDemoBillingContext) {
        setPlans(DEMO_BILLING_PLANS);
        setEntitlements(getDemoBillingEntitlements(selectedCompany));
        setSubscription(null);
        setPaymentEvents([]);
        setError(
          'Não foi possível carregar o plano em tempo real. Exibindo a configuração local de demonstração.',
        );
        return;
      }

      setPlans([]);
      setEntitlements(null);
      setSubscription(null);
      setPaymentEvents([]);
      setError(
        'Não foi possível carregar o plano em tempo real para esta empresa. Verifique a API de billing antes de alterar assinatura em produção.',
      );
    } finally {
      setLoading(false);
    }
  }, [isDemoBillingContext, selectedCompany, webhookStatusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChangePlan = async (planLevel: PlanLevel) => {
    if (!selectedCompany?.id || isDemoBillingContext) return;
    if (entitlements?.planLevel === planLevel) return;

    setUpdating(planLevel);
    setError(null);
    setFeedback(null);
    try {
      if (planLevel !== 'FREE') {
        if (hasBillableSubscription(subscription)) {
          const portal = await paymentsApi.createBillingPortalSession(selectedCompany.id, {
            returnUrl: `${window.location.origin}/dashboard/settings?billing=portal`,
          });

          window.location.assign(portal.portalSession.portalUrl);
          return;
        }

        const checkout = await paymentsApi.createCheckoutSession(selectedCompany.id, {
          planLevel,
          successUrl: `${window.location.origin}/dashboard/settings?billing=success`,
          cancelUrl: `${window.location.origin}/dashboard/settings?billing=cancel`,
        });

        window.location.assign(checkout.checkoutSession.checkoutUrl);
        return;
      }

      const response = await billingApi.updatePlan(
        selectedCompany.id,
        planLevel,
        'Alteração via painel de Configurações',
      );
      setFeedback(response.message ?? 'Plano atualizado com sucesso.');
      await load();
    } catch (err: unknown) {
      const apiError = err as ApiErrorLike;
      const message =
        apiError.response?.data?.message ||
        apiError.message ||
        'Não foi possível atualizar o plano.';
      setError(message);
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenBillingPortal = async () => {
    if (!selectedCompany?.id || isDemoBillingContext) return;

    setOpeningPortal(true);
    setError(null);
    setFeedback(null);
    try {
      const portal = await paymentsApi.createBillingPortalSession(selectedCompany.id, {
        returnUrl: `${window.location.origin}/dashboard/settings?billing=portal`,
      });

      window.location.assign(portal.portalSession.portalUrl);
    } catch (err: unknown) {
      const apiError = err as ApiErrorLike;
      const message =
        apiError.response?.data?.message ||
        apiError.message ||
        'Não foi possível abrir o portal de cobrança.';
      setError(message);
    } finally {
      setOpeningPortal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="animate-spin mr-2" size={18} />
        Carregando plano atual...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isDemoBillingContext && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg px-4 py-3">
          Você está em uma sessão de demonstração. Mudanças de plano estão desabilitadas.
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {feedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg px-4 py-3">
          {feedback}
        </div>
      )}

      {/* Plano atual + limites */}
      {entitlements && (
        <div className="bg-[#090d16] border border-white/5 rounded-2xl p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Plano atual
              </p>
              <p className="text-2xl font-black text-white mt-1">{entitlements.plan.label}</p>
              <p className="text-xs text-slate-500 mt-2">
                {subscription
                  ? `Assinatura ${subscription.status} via ${subscription.provider}`
                  : 'Sem assinatura ativa registrada pelo gateway.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-full">
                {entitlements.company.name}
              </span>
              {!isDemoBillingContext && subscription && (
                <button
                  onClick={handleOpenBillingPortal}
                  disabled={openingPortal}
                  className="rounded-xl bg-white text-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {openingPortal && <Loader2 className="animate-spin" size={13} />}
                  Gerenciar cobrança
                </button>
              )}
            </div>
          </div>
          {subscription?.currentPeriodEnd && (
            <div className="mb-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
              Próxima renovação/período atual até{' '}
              <span className="font-bold text-slate-200">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
              </span>
              {subscription.cancelAtPeriodEnd ? ' · cancelamento agendado ao fim do período' : ''}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <LimitStat label="Empresas" value={formatLimit(entitlements.limits.companies)} />
            <LimitStat label="Usuários" value={formatLimit(entitlements.limits.users)} />
            <LimitStat
              label="Notas / mês"
              value={formatLimit(entitlements.limits.invoicesPerMonth)}
            />
            <LimitStat
              label="Transações bancárias / mês"
              value={formatLimit(entitlements.limits.bankTransactionsPerMonth)}
            />
          </div>
        </div>
      )}

      {!isDemoBillingContext && (
        <div className="bg-[#090d16] border border-white/5 rounded-2xl p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Activity size={13} /> Auditoria do gateway
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Últimos eventos recebidos para checkout, assinatura e sincronização de plano.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={webhookStatusFilter}
                onChange={(event) =>
                  setWebhookStatusFilter(event.target.value as PaymentWebhookDeliveryStatus | 'ALL')
                }
                className="rounded-xl border border-white/10 bg-[#050914] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 outline-none focus:border-blue-500"
              >
                {WEBHOOK_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === 'ALL' ? 'Todos' : webhookStatusLabel(status)}
                  </option>
                ))}
              </select>
              <button
                onClick={load}
                disabled={loading}
                className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Atualizar
              </button>
            </div>
          </div>

          {paymentEvents.length > 0 ? (
            <div className="divide-y divide-white/5 rounded-xl border border-white/5 overflow-hidden">
              {paymentEvents.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="grid gap-3 px-4 py-3 md:grid-cols-[1.2fr_0.9fr_auto] md:items-center bg-white/[0.015]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">{event.eventType}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {event.provider} · {event.providerEventId}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <p>Criado: {formatDateTime(event.createdAt)}</p>
                    <p>Processado: {formatDateTime(event.processedAt)}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${webhookStatusClass(
                      event.status,
                    )}`}
                  >
                    {webhookStatusLabel(event.status)}
                  </span>
                  {event.errorMessage && (
                    <p className="md:col-span-3 text-[11px] font-semibold text-red-300">
                      {event.errorMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
              Nenhum evento de gateway registrado para esta empresa.
            </div>
          )}
        </div>
      )}

      {/* Cards de planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans
          .slice()
          .sort((a, b) => PLAN_ORDER[a.level] - PLAN_ORDER[b.level])
          .map((plan) => {
            const isCurrent = entitlements?.planLevel === plan.level;
            const isRecommended = entitlements?.commercial.recommendedPlan === plan.level;
            const planFeatures =
              entitlements?.features.filter((f: BillingFeature) => f.minPlan === plan.level) ?? [];

            return (
              <div
                key={plan.level}
                className={`relative rounded-2xl p-6 border transition-all ${
                  isCurrent
                    ? 'bg-blue-500/10 border-blue-500/40'
                    : 'bg-[#090d16] border-white/5 hover:border-white/10'
                }`}
              >
                {isRecommended && !isCurrent && (
                  <span className="absolute -top-3 left-6 text-[9px] font-black uppercase tracking-wider text-white bg-blue-600 px-3 py-1 rounded-full">
                    Recomendado
                  </span>
                )}

                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {plan.level}
                </p>
                <p className="text-xl font-black text-white mt-1">{plan.label}</p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plan.description}</p>

                <div className="mt-5 space-y-2 text-xs text-slate-300">
                  <FeatureRow label={`${formatLimit(plan.limits.companies)} empresa(s)`} />
                  <FeatureRow label={`${formatLimit(plan.limits.users)} usuário(s)`} />
                  <FeatureRow label={`${formatLimit(plan.limits.invoicesPerMonth)} notas/mês`} />
                  <FeatureRow label={`Auditoria: ${plan.limits.auditRetentionDays} dias`} />
                  {planFeatures.map((f) => (
                    <FeatureRow key={f.key} label={f.label} feature={f} />
                  ))}
                </div>

                <button
                  onClick={() => handleChangePlan(plan.level)}
                  disabled={isCurrent || isDemoBillingContext || updating !== null}
                  className={`w-full mt-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-white/5 text-slate-500 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50'
                  }`}
                >
                  {updating === plan.level ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : isCurrent ? (
                    <>
                      <Check size={14} /> Plano atual
                    </>
                  ) : (
                    'Selecionar plano'
                  )}
                </button>
              </div>
            );
          })}
      </div>

      {/* Features bloqueadas no plano atual */}
      {entitlements && entitlements.commercial.upgradeReasons.length > 0 && (
        <div className="bg-[#090d16] border border-white/5 rounded-2xl p-6">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Lock size={12} /> Desbloqueie com upgrade
          </p>
          <ul className="space-y-2">
            {entitlements.commercial.upgradeReasons.map((reason) => (
              <li key={reason} className="flex items-center gap-2 text-xs text-slate-400">
                <ChevronRight size={12} className="text-blue-500" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LimitStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-lg font-black text-white mt-1">{value}</p>
    </div>
  );
}

function formatMarketReadiness(readiness?: BillingFeature['marketReadiness']): string | null {
  if (!readiness) return null;
  if (readiness === 'SELLABLE') return 'Vendável';
  if (readiness === 'ASSISTED_BETA') return 'Venda assistida';
  return 'Roadmap bloqueado';
}

function FeatureRow({ label, feature }: { label: string; feature?: BillingFeature }) {
  const readinessLabel = formatMarketReadiness(feature?.marketReadiness);

  return (
    <div className="flex items-start gap-2">
      <Check size={12} className="mt-0.5 text-emerald-500 shrink-0" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span>{label}</span>
          {readinessLabel && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
              {readinessLabel}
            </span>
          )}
        </span>
        {feature?.commercialGuardrail && feature.marketReadiness !== 'SELLABLE' && (
          <span className="mt-1 block text-[11px] leading-4 text-amber-200/80">
            {feature.commercialGuardrail}
          </span>
        )}
      </span>
    </div>
  );
}

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  companies?: unknown[];
};

function readStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;

  for (const key of ['bcost_user', 'user', 'auth_user']) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as StoredUser;
      if (parsed?.email || parsed?.name || parsed?.id) return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

function formatTaxRegime(value?: string | null) {
  if (!value) return 'Não informado';

  const labels: Record<string, string> = {
    SIMPLES_NACIONAL: 'Simples Nacional',
    LUCRO_PRESUMIDO: 'Lucro Presumido',
    LUCRO_REAL: 'Lucro Real',
  };

  return labels[value] || value;
}

function SettingsInfoCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[#090d16] border border-white/5 rounded-2xl p-6">
      <div className="mb-5">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function SettingsField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-200 mt-1 break-words">
        {value || 'Não informado'}
      </p>
    </div>
  );
}

function ProfileSection() {
  const [user] = useState<StoredUser | null>(() => readStoredUser());

  return (
    <SettingsInfoCard
      title="Perfil do usuário"
      description="Identidade usada na sessão atual e nas trilhas de auditoria do tenant."
    >
      <SettingsField label="Nome" value={user?.name} />
      <SettingsField label="E-mail" value={user?.email} />
      <SettingsField label="Perfil de acesso" value={user?.role || 'Usuário autenticado'} />
      <SettingsField label="Identificador" value={user?.id} />
    </SettingsInfoCard>
  );
}

function CompanySection() {
  const { selectedCompany } = useCompany();

  return (
    <SettingsInfoCard
      title="Dados da empresa ativa"
      description="Contexto multi-tenant aplicado aos módulos fiscais, financeiros e contábeis."
    >
      <SettingsField label="Razão social / Nome" value={selectedCompany?.name} />
      <SettingsField label="CNPJ" value={selectedCompany?.cnpj} />
      <SettingsField
        label="Regime tributário"
        value={formatTaxRegime(selectedCompany?.taxRegime)}
      />
      <SettingsField label="CNAE principal" value={selectedCompany?.cnae} />
      <SettingsField label="ID do tenant" value={selectedCompany?.id} />
    </SettingsInfoCard>
  );
}

function UsersSection() {
  const { companies } = useCompany();
  const [user] = useState<StoredUser | null>(() => readStoredUser());

  return (
    <SettingsInfoCard
      title="Usuários e permissões"
      description="Resumo de acesso disponível na sessão. Alterações sensíveis devem permanecer auditáveis."
    >
      <SettingsField label="Usuário autenticado" value={user?.email || user?.name} />
      <SettingsField label="Empresas vinculadas no contexto" value={companies.length} />
      <SettingsField label="Escopo operacional" value="Tenant ativo isolado por x-company-id" />
      <SettingsField
        label="Governança"
        value="Convites, papéis e remoções exigem endpoint auditado"
      />
    </SettingsInfoCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('billing');

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gerencie seu perfil, empresa, equipe e plano de assinatura.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navegação lateral de seções */}
        <nav className="md:w-56 shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon size={14} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Conteúdo da seção ativa */}
        <div className="flex-1 min-w-0">
          {activeSection === 'billing' && <BillingSection />}
          {activeSection === 'profile' && <ProfileSection />}
          {activeSection === 'company' && <CompanySection />}
          {activeSection === 'users' && <UsersSection />}
        </div>
      </div>
    </div>
  );
}
