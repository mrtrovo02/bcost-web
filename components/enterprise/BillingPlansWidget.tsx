'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Crown,
  Gauge,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unlock,
  Users,
  Zap,
} from 'lucide-react';

import {
  billingApi,
  BillingEntitlementsResponse,
  BillingFeature,
  BillingPlan,
  DEMO_BILLING_PLANS,
  getDemoBillingEntitlements,
  PlanLevel,
} from '@/lib/api/billing';
import { isDemoEntityId, isOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';
import { paymentsApi, type PaymentSubscriptionResponse } from '@/lib/api/payments';
import { getToken } from '@/services/api';

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

const BILLABLE_SUBSCRIPTION_STATUSES = new Set(['ACTIVE', 'TRIALING', 'PAST_DUE']);

function hasRealAuthToken(): boolean {
  const token = getToken();
  return Boolean(token && token !== 'demo-token-local');
}

function hasBillableSubscription(
  subscription: PaymentSubscriptionResponse['subscription'],
): boolean {
  return Boolean(subscription?.status && BILLABLE_SUBSCRIPTION_STATUSES.has(subscription.status));
}

async function resolveCompanyId(): Promise<string> {
  return resolveEnterpriseCompanyIdWithFallback();
}

function planTone(plan?: PlanLevel) {
  if (plan === 'ENTERPRISE') {
    return {
      badge: 'border-purple-200 bg-purple-50 text-purple-700',
      card: 'border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50',
      icon: 'bg-purple-100 text-purple-700',
    };
  }

  if (plan === 'PRO') {
    return {
      badge: 'border-blue-200 bg-blue-50 text-blue-700',
      card: 'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50',
      icon: 'bg-blue-100 text-blue-700',
    };
  }

  return {
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    card: 'border-slate-200 bg-white',
    icon: 'bg-slate-100 text-slate-700',
  };
}

function formatLimit(value: number) {
  if (value >= 999999) return 'Ilimitado';
  if (value >= 3650) return '10 anos';
  return new Intl.NumberFormat('pt-BR').format(value);
}

function featureGroup(feature: BillingFeature) {
  const key = feature.key;

  if (key.startsWith('automation.')) return 'Automação';
  if (key.startsWith('audit.')) return 'Auditoria';
  if (key.startsWith('fiscal.')) return 'Fiscal';
  if (key.startsWith('banking.')) return 'Bancário';
  if (key.startsWith('revenue.')) return 'Receita';
  if (key.startsWith('accounting.')) return 'Contábil';
  if (key.startsWith('digital.')) return 'Certificados';
  if (key.startsWith('ai.')) return 'IA';
  if (key.startsWith('webhooks')) return 'Integrações';
  if (key.startsWith('support.')) return 'Suporte';

  return 'Plataforma';
}

function groupFeatures(features: BillingFeature[]) {
  return features.reduce<Record<string, BillingFeature[]>>((acc, feature) => {
    const group = featureGroup(feature);

    if (!acc[group]) acc[group] = [];
    acc[group].push(feature);

    return acc;
  }, {});
}

function formatMarketReadiness(readiness?: BillingFeature['marketReadiness']) {
  if (!readiness) return null;
  if (readiness === 'SELLABLE') return 'Vendável';
  if (readiness === 'ASSISTED_BETA') return 'Venda assistida';
  return 'Roadmap bloqueado';
}

function readinessTone(readiness?: BillingFeature['marketReadiness']) {
  if (readiness === 'SELLABLE') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (readiness === 'ASSISTED_BETA') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (readiness === 'ROADMAP_LOCKED') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function BillingFeatureCard({
  feature,
  mode,
}: {
  feature: BillingFeature;
  mode: 'enabled' | 'locked';
}) {
  const readinessLabel = formatMarketReadiness(feature.marketReadiness);
  const Icon = mode === 'enabled' ? CheckCircle2 : AlertTriangle;
  const iconClass = mode === 'enabled' ? 'text-emerald-600' : 'text-amber-600';

  return (
    <div
      key={feature.key}
      className={`rounded-2xl border bg-white p-3 ${
        mode === 'enabled' ? 'border-emerald-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 flex-none ${iconClass}`} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
            <span>{feature.label}</span>
            {readinessLabel && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${readinessTone(
                  feature.marketReadiness,
                )}`}
              >
                {readinessLabel}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{feature.description}</div>
          {feature.commercialGuardrail && feature.marketReadiness !== 'SELLABLE' && (
            <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
              {feature.commercialGuardrail}
            </div>
          )}
          {mode === 'locked' && (
            <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
              Exige {feature.minPlan}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: PlanLevel }) {
  const tone = planTone(plan);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${tone.badge}`}
    >
      {plan === 'ENTERPRISE' ? (
        <Crown className="h-4 w-4" />
      ) : plan === 'PRO' ? (
        <Zap className="h-4 w-4" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {plan}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-xl font-bold text-slate-950">{value}</div>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  active,
  loading,
  hasBillableSubscription,
  onSelect,
}: {
  plan: BillingPlan;
  active: boolean;
  loading: boolean;
  hasBillableSubscription: boolean;
  onSelect: (plan: PlanLevel) => void;
}) {
  const tone = planTone(plan.level);
  const shouldRouteToPortal = hasBillableSubscription && plan.level !== 'FREE';

  return (
    <article className={`rounded-3xl border p-5 shadow-sm transition ${tone.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <PlanBadge plan={plan.level} />
          <h3 className="mt-4 text-lg font-bold text-slate-950">{plan.label}</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>
        </div>

        <div className={`rounded-2xl p-3 ${tone.icon}`}>
          {plan.level === 'ENTERPRISE' ? (
            <Crown className="h-5 w-5" />
          ) : plan.level === 'PRO' ? (
            <Zap className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-xs text-slate-600">
        <div className="flex justify-between gap-3">
          <span>Usuários</span>
          <strong>{formatLimit(plan.limits.users)}</strong>
        </div>
        <div className="flex justify-between gap-3">
          <span>Notas/mês</span>
          <strong>{formatLimit(plan.limits.invoicesPerMonth)}</strong>
        </div>
        <div className="flex justify-between gap-3">
          <span>Jobs/mês</span>
          <strong>{formatLimit(plan.limits.automationJobsPerMonth)}</strong>
        </div>
        <div className="flex justify-between gap-3">
          <span>IA/mês</span>
          <strong>{formatLimit(plan.limits.aiQuestionsPerMonth)}</strong>
        </div>
      </div>

      <button
        type="button"
        disabled={active || loading}
        onClick={() => onSelect(plan.level)}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
          active
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300'
        }`}
      >
        {active ? (
          <>
            <BadgeCheck className="h-4 w-4" />
            Plano atual
          </>
        ) : loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Atualizando...
          </>
        ) : (
          <>
            {shouldRouteToPortal ? `Gerenciar ${plan.label}` : `Ativar ${plan.label}`}
            <ArrowUpRight className="h-4 w-4" />
          </>
        )}
      </button>
    </article>
  );
}

export default function BillingPlansWidget() {
  const [companyId, setCompanyId] = useState<string>('');
  const [entitlements, setEntitlements] = useState<BillingEntitlementsResponse | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] =
    useState<PaymentSubscriptionResponse['subscription']>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<PlanLevel | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const resolvedCompanyId = companyId || (await resolveCompanyId());
      setCompanyId(resolvedCompanyId);

      const [plansResponse, entitlementsResponse] = await Promise.all([
        billingApi.plans(),
        billingApi.entitlements(resolvedCompanyId),
      ]);

      setPlans(plansResponse.plans || []);
      setEntitlements(entitlementsResponse);
      setSubscription(null);

      if (hasRealAuthToken() && !isDemoEntityId(resolvedCompanyId)) {
        const subscriptionResponse = await paymentsApi.subscription(resolvedCompanyId);
        setSubscription(subscriptionResponse.subscription ?? null);
      }

      if (
        String(plansResponse.status).includes('DEMO') ||
        String(entitlementsResponse.status).includes('DEMO')
      ) {
        setMessage({
          type: 'info',
          title: 'Billing em modo demonstrativo',
          description:
            'A API real não respondeu nesta sessão. Os limites e features seguem visíveis para validação operacional.',
        });
      }
    } catch (error) {
      if (hasRealAuthToken() || !isOperationalDemoFallbackEnabled()) {
        setPlans([]);
        setEntitlements(null);
        setSubscription(null);
        setMessage({
          type: 'error',
          title: 'Billing indisponível',
          description:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os dados reais de billing.',
        });
        return;
      }

      const fallbackCompany = {
        id: isDemoEntityId(companyId) ? companyId : 'demo-001',
        name: 'Empresa Demo',
      };
      setCompanyId(fallbackCompany.id);
      setPlans(DEMO_BILLING_PLANS);
      setEntitlements(getDemoBillingEntitlements(fallbackCompany, 'ENTERPRISE'));
      setSubscription(null);
      setMessage({
        type: 'warning',
        title: 'Billing carregado em fallback',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados reais de billing.',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPlan = entitlements?.planLevel || 'FREE';
  const tone = planTone(selectedPlan);

  const groupedEnabled = useMemo(() => {
    return groupFeatures((entitlements?.features || []).filter((feature) => feature.enabled));
  }, [entitlements]);

  const groupedLocked = useMemo(() => {
    return groupFeatures((entitlements?.features || []).filter((feature) => feature.locked));
  }, [entitlements]);

  const currentLimits = entitlements?.limits;
  const billableSubscriptionActive = hasBillableSubscription(subscription);

  const handlePlanChange = useCallback(
    async (planLevel: PlanLevel) => {
      if (!companyId) return;

      setActionLoading(planLevel);
      setMessage(null);

      try {
        if (hasRealAuthToken() && !isDemoEntityId(companyId) && planLevel !== 'FREE') {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';

          if (hasBillableSubscription(subscription)) {
            const portal = await paymentsApi.createBillingPortalSession(companyId, {
              returnUrl: `${origin}/dashboard/settings?billing=portal`,
            });

            window.location.assign(portal.portalSession.portalUrl);
            return;
          }

          const checkout = await paymentsApi.createCheckoutSession(companyId, {
            planLevel,
            successUrl: `${origin}/dashboard/settings?billing=success`,
            cancelUrl: `${origin}/dashboard/settings?billing=cancel`,
          });

          window.location.assign(checkout.checkoutSession.checkoutUrl);
          return;
        }

        const response = await billingApi.updatePlan(
          companyId,
          planLevel,
          `Alteração de plano via Dashboard Enterprise para ${planLevel}`,
        );

        setEntitlements(response);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message,
          description: response.audit?.recorded
            ? 'Alteração registrada com AuditLog comercial.'
            : `Plano atualizado, mas AuditLog retornou alerta: ${
                response.audit?.error || 'não registrado'
              }`,
        });
      } catch (error) {
        setMessage({
          type: 'error',
          title: planLevel === 'FREE' ? 'Falha ao alterar plano' : 'Falha ao iniciar checkout',
          description:
            error instanceof Error
              ? error.message
              : 'Não foi possível iniciar a operação comercial.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, subscription],
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            SaaS Monetization
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Billing, planos e feature flags
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Controle comercial do bCost com planos, limites, features premium e base para
            monetização SaaS enterprise.
          </p>

          {entitlements?.company && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Building2 className="h-4 w-4" />
              <span className="font-semibold text-slate-700">{entitlements.company.name}</span>
              <span className="font-mono">{entitlements.company.cnpj}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {entitlements && <PlanBadge plan={selectedPlan} />}

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mt-5 rounded-2xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : message.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : message.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}
        >
          <div className="font-semibold">{message.title}</div>
          {message.description && <div className="mt-1 opacity-90">{message.description}</div>}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando plano e entitlements...
        </div>
      ) : entitlements ? (
        <>
          <div className={`mt-6 rounded-3xl border p-5 ${tone.card}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-500">Plano atual</div>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <PlanBadge plan={selectedPlan} />
                  <span className="text-2xl font-bold text-slate-950">
                    {entitlements.plan.label}
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {entitlements.plan.description}
                </p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status comercial
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {entitlements.commercial.canUpgrade
                    ? `Upgrade recomendado: ${entitlements.commercial.recommendedPlan}`
                    : 'Plano máximo ativo'}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {entitlements.lockedFeatures.length === 0
                    ? 'Todas as features do catálogo estão liberadas.'
                    : `${entitlements.lockedFeatures.length} feature(s) bloqueada(s).`}
                </div>
              </div>
            </div>
          </div>

          {currentLimits && (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Usuários"
                value={formatLimit(currentLimits.users)}
                icon={<Users className="h-5 w-5" />}
              />
              <MetricCard
                label="Notas/mês"
                value={formatLimit(currentLimits.invoicesPerMonth)}
                icon={<Gauge className="h-5 w-5" />}
              />
              <MetricCard
                label="Jobs/mês"
                value={formatLimit(currentLimits.automationJobsPerMonth)}
                icon={<Zap className="h-5 w-5" />}
              />
              <MetricCard
                label="Retenção auditável"
                value={formatLimit(currentLimits.auditRetentionDays)}
                icon={<ShieldCheck className="h-5 w-5" />}
              />
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.level}
                plan={plan}
                active={plan.level === selectedPlan}
                loading={actionLoading === plan.level}
                hasBillableSubscription={billableSubscriptionActive}
                onSelect={handlePlanChange}
              />
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <Unlock className="h-5 w-5" />
                Features liberadas
              </div>

              <div className="mt-4 space-y-4">
                {Object.keys(groupedEnabled).length === 0 ? (
                  <div className="text-sm text-slate-500">Nenhuma feature liberada.</div>
                ) : (
                  Object.entries(groupedEnabled).map(([group, features]) => (
                    <div key={group}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        {group}
                      </div>

                      <div className="grid gap-2">
                        {features.map((feature) => (
                          <BillingFeatureCard key={feature.key} feature={feature} mode="enabled" />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Lock className="h-5 w-5" />
                Features bloqueadas
              </div>

              <div className="mt-4 space-y-4">
                {Object.keys(groupedLocked).length === 0 ? (
                  <div className="rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-emerald-700">
                    <div className="flex items-center gap-2 font-semibold">
                      <BadgeCheck className="h-4 w-4" />
                      Nenhuma feature bloqueada.
                    </div>
                    <div className="mt-1 text-xs">
                      A empresa está no plano com maior liberação comercial.
                    </div>
                  </div>
                ) : (
                  Object.entries(groupedLocked).map(([group, features]) => (
                    <div key={group}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {group}
                      </div>

                      <div className="grid gap-2">
                        {features.map((feature) => (
                          <BillingFeatureCard key={feature.key} feature={feature} mode="locked" />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {entitlements.commercial.upgradeReasons.length > 0 && (
            <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 flex-none" />
                <div>
                  <div className="font-bold">Motivos comerciais para upgrade</div>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {entitlements.commercial.upgradeReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          Nenhuma informação de billing carregada.
        </div>
      )}
    </section>
  );
}
