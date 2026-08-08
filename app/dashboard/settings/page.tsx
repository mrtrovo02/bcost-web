'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Users,
  CreditCard,
  Check,
  Lock,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { isDemoSession } from '@/services/api';
import { useCompany } from '@/app/context/CompanyContext';
import {
  billingApi,
  DEMO_BILLING_PLANS,
  getDemoBillingEntitlements,
  type BillingEntitlementsResponse,
  type BillingFeature,
  type BillingPlan,
  type PlanLevel,
} from '@/lib/api/billing';

type ApiErrorLike = {
  response?: { data?: { message?: string } };
  message?: string;
};

type SectionKey = 'profile' | 'company' | 'users' | 'billing';

const SECTIONS: { key: SectionKey; label: string; icon: typeof User; ready: boolean }[] = [
  { key: 'profile', label: 'Perfil', icon: User, ready: false },
  { key: 'company', label: 'Empresa', icon: Building2, ready: false },
  { key: 'users', label: 'Usuários', icon: Users, ready: false },
  { key: 'billing', label: 'Plano e Cobrança', icon: CreditCard, ready: true },
];

const PLAN_ORDER: Record<PlanLevel, number> = { FREE: 1, PRO: 2, ENTERPRISE: 3 };

function formatLimit(value: number): string {
  if (value >= 999999) return 'Ilimitado';
  if (value >= 999) return 'Ilimitado';
  return value.toLocaleString('pt-BR');
}

// ─────────────────────────────────────────────────────────────────────────
// Seção: Plano e Cobrança
// ─────────────────────────────────────────────────────────────────────────

function BillingSection() {
  const { selectedCompany } = useCompany();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [entitlements, setEntitlements] = useState<BillingEntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<PlanLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedCompany?.id) return;
    setLoading(true);
    setError(null);
    try {
      if (isDemoSession()) {
        setPlans(DEMO_BILLING_PLANS);
        setEntitlements(getDemoBillingEntitlements(selectedCompany));
        return;
      }

      const [plansRes, entitlementsRes] = await Promise.all([
        billingApi.plans(),
        billingApi.entitlements(selectedCompany.id),
      ]);
      setPlans(plansRes.plans ?? []);
      setEntitlements(entitlementsRes ?? null);
    } catch (err) {
      console.error('[Settings/Billing] load failed:', err);
      setPlans(DEMO_BILLING_PLANS);
      setEntitlements(getDemoBillingEntitlements(selectedCompany));
      setError(
        'Não foi possível carregar o plano em tempo real. Exibindo a configuração local de assinatura.',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChangePlan = async (planLevel: PlanLevel) => {
    if (!selectedCompany?.id || isDemoSession()) return;
    if (entitlements?.planLevel === planLevel) return;

    setUpdating(planLevel);
    setError(null);
    setFeedback(null);
    try {
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
      {isDemoSession() && (
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Plano atual
              </p>
              <p className="text-2xl font-black text-white mt-1">{entitlements.plan.label}</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-full">
              {entitlements.company.name}
            </span>
          </div>
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
                    <FeatureRow key={f.key} label={f.label} />
                  ))}
                </div>

                <button
                  onClick={() => handleChangePlan(plan.level)}
                  disabled={isCurrent || isDemoSession() || updating !== null}
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

function FeatureRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check size={12} className="text-emerald-500 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Placeholder para seções ainda não implementadas no backend
// ─────────────────────────────────────────────────────────────────────────

function ComingSoonSection({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <SettingsIcon size={20} className="text-slate-500" />
      </div>
      <p className="text-sm font-black text-slate-300">{title}</p>
      <p className="text-xs text-slate-500 mt-1">Em desenvolvimento — em breve disponível.</p>
    </div>
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
                  {!section.ready && (
                    <span className="ml-auto text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full">
                      EM BREVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Conteúdo da seção ativa */}
        <div className="flex-1 min-w-0">
          {activeSection === 'billing' && <BillingSection />}
          {activeSection === 'profile' && <ComingSoonSection title="Perfil do usuário" />}
          {activeSection === 'company' && <ComingSoonSection title="Dados da empresa" />}
          {activeSection === 'users' && <ComingSoonSection title="Usuários e permissões" />}
        </div>
      </div>
    </div>
  );
}
