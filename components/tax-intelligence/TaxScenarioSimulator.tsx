'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useCompany } from '@/app/context/CompanyContext';
import { taxScenariosApi, type SimulateTaxScenarioDto, type SimulationResponse } from '@/lib/api/tax-scenarios';

const BASE_FORM: Omit<SimulateTaxScenarioDto, 'companyId'> = {
  activity: 'SERVICE_PROVIDER',
  monthlyRevenue: 220000,
  monthlyDeductibleExpenses: 35000,
  monthlyPayroll: 50000,
  dependents: 1,
  currentModel: 'PF',
};

export default function TaxScenarioSimulator() {
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<SimulateTaxScenarioDto>({
    ...BASE_FORM,
    companyId: selectedCompany?.id,
  });
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = <K extends keyof SimulateTaxScenarioDto>(
    key: K,
    value: SimulateTaxScenarioDto[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: SimulateTaxScenarioDto = {
        ...form,
        companyId: selectedCompany?.id ?? form.companyId,
        monthlyRevenue: Number(form.monthlyRevenue || 0),
        monthlyDeductibleExpenses: Number(form.monthlyDeductibleExpenses || 0),
        monthlyPayroll: Number(form.monthlyPayroll || 0),
        dependents: Number(form.dependents || 0),
      };

      const data = await taxScenariosApi.simulate(payload);
      setResult(data);
    } catch (requestError) {
      console.error('Tax scenario simulation failed', requestError);
      setError('Não foi possível calcular o cenário tributário. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const bestModel = result?.bestEstimatedModel ?? 'SIMPLES_NACIONAL';
  const bestComparison = result?.comparisons.find((comparison) => comparison.model === bestModel);
  const blockingGuardrails =
    result?.guardrails.filter((item) => item.toLowerCase().includes('bloqueia')) ?? [];
  const complianceRules =
    result?.complianceTrail?.rules.filter((rule) => rule.severity !== 'INFO') ?? [];
  const commercialDecision = result?.complianceTrail?.commercialDecision;
  const serviceQualification = result?.serviceQualification;
  const preProposal = result?.preProposal;
  const auditLines = result?.calculationAudit?.lines ?? [];
  const preProposalRiskTone = resolvePreProposalRiskTone(preProposal?.riskLevel);
  const preProposalValidUntil = preProposal
    ? new Intl.DateTimeFormat('pt-BR').format(new Date(preProposal.validUntil))
    : null;

  return (
    <section className="bg-[#090d16] border border-white/5 rounded-[2.5rem] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-400">
            Tax Intelligence Engine
          </p>
          <h3 className="mt-2 text-2xl font-black text-white tracking-tight">
            Simulador de regime tributário
          </h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
          <ShieldCheck size={14} />
          Governança e auditoria
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4 rounded-[2rem] border border-white/5 bg-[#0d1320] p-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Faturamento mensal
              <input
                type="number"
                value={form.monthlyRevenue}
                onChange={(event) => handleChange('monthlyRevenue', Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Despesas dedutíveis
              <input
                type="number"
                value={form.monthlyDeductibleExpenses}
                onChange={(event) => handleChange('monthlyDeductibleExpenses', Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Folha mensal
              <input
                type="number"
                value={form.monthlyPayroll}
                onChange={(event) => handleChange('monthlyPayroll', Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Dependentes
              <input
                type="number"
                min={0}
                max={20}
                value={form.dependents}
                onChange={(event) => handleChange('dependents', Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Atividade
              <select
                value={form.activity}
                onChange={(event) => handleChange('activity', event.target.value as SimulateTaxScenarioDto['activity'])}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="SERVICE_PROVIDER">Prestação de serviços</option>
                <option value="TECHNOLOGY">Tecnologia</option>
                <option value="LEGAL">Jurídico</option>
                <option value="CONSULTING">Consultoria</option>
                <option value="HEALTHCARE">Saúde</option>
                <option value="CREATOR">Criador</option>
                <option value="OTHER">Outros</option>
              </select>
            </label>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Modelo atual
              <select
                value={form.currentModel ?? 'PF'}
                onChange={(event) => handleChange('currentModel', event.target.value as SimulateTaxScenarioDto['currentModel'])}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="PF">PF</option>
                <option value="MEI">MEI</option>
                <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Calculando...' : 'Simular cenário'}
          </button>

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <MetricTile
                  label="Melhor regime"
                  value={result.bestEstimatedModel.replace('_', ' ')}
                  tone="blue"
                />
                <MetricTile
                  label="Fator R"
                  value={`${result.factorR.percentage.toFixed(1)}%`}
                  tone="amber"
                />
                <MetricTile
                  label="Economia anual"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(result.annualSavings ?? 0)}
                  tone="emerald"
                />
                <MetricTile
                  label="Taxa efetiva"
                  value={`${bestComparison?.estimatedEffectiveRate ?? 0}%`}
                  tone="rose"
                />
              </div>

              {result.regressionSuite && (
                <div className="rounded-2xl border border-white/5 bg-[#0d1320] px-4 py-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      QA fiscal: {result.regressionSuite.version}
                    </p>
                    <p className="text-[11px] font-bold text-slate-300">
                      Regras críticas: {result.regressionSuite.blockingCriticalities.join(', ')} • Cobertura {result.regressionSuite.coveredRules.length}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-[2rem] border border-white/5 bg-[#0d1320] p-5">
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                      Recomendação do motor
                    </p>
                    <h4 className="mt-2 text-xl font-black text-white">{result.recommendation.title}</h4>
                  </div>
                  {result.recommendation.decision === 'PJ_SIMULATION_RECOMMENDED' ? (
                    <CheckCircle2 className="text-emerald-400" size={24} />
                  ) : (
                    <AlertTriangle className="text-amber-400" size={24} />
                  )}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                      Racional
                    </p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {result.recommendation.rationale.map((item) => (
                        <li key={item} className="flex gap-2">
                          <ArrowRight size={14} className="mt-0.5 text-blue-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                      Próximos passos
                    </p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {result.recommendation.nextActions.map((item) => (
                        <li key={item} className="flex gap-2">
                          <TrendingUp size={14} className="mt-0.5 text-emerald-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {blockingGuardrails.length > 0 && (
                <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 text-amber-300" size={20} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                        Bloqueio regulatório
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-amber-100">
                        {blockingGuardrails.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {result.complianceTrail && (
                <div className="rounded-[2rem] border border-blue-500/20 bg-blue-500/5 p-5">
                  <div className="flex flex-col gap-3 border-b border-white/5 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">
                        Trilha de conformidade fiscal
                      </p>
                      <h4 className="mt-2 text-lg font-black text-white">
                        {result.complianceTrail.officialAssessment
                          ? 'Apuração oficial habilitada'
                          : 'Apuração oficial bloqueada'}
                      </h4>
                    </div>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                      {commercialDecision?.status.replaceAll('_', ' ') ?? result.complianceTrail.calculationMode.replace('_', ' ')}
                    </span>
                  </div>

                  {commercialDecision && (
                    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                        Gate comercial
                      </p>
                      <p className="mt-2 text-sm font-bold text-white">
                        {commercialDecision.canGenerateProposal
                          ? 'Proposta assistida permitida após validação CRC.'
                          : commercialDecision.status === 'BLOCKED_BY_COMPLIANCE'
                            ? 'Proposta automática bloqueada por regra de compliance.'
                            : 'Proposta automática bloqueada até revisão assistida.'}
                      </p>
                      {commercialDecision.reasons.length > 0 && (
                        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-amber-50/90">
                          {commercialDecision.reasons.slice(0, 3).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {(complianceRules.length > 0 ? complianceRules : result.complianceTrail.rules.slice(0, 2)).map((rule) => (
                      <div key={rule.code} className="rounded-2xl border border-white/5 bg-[#090d16] p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-black text-white">{rule.title}</p>
                            <p className="mt-2 text-xs leading-relaxed text-slate-300">{rule.result}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                            {rule.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                          Evidências: {rule.evidenceRequired.slice(0, 3).join(', ')}.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {serviceQualification && (
                <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="flex flex-col gap-3 border-b border-white/5 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                        Qualificação comercial segura
                      </p>
                      <h4 className="mt-2 text-lg font-black text-white">
                        {serviceQualification.primaryOffer.title}
                      </h4>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                      {serviceQualification.primaryOffer.checkoutMode.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Ações permitidas
                      </p>
                      <ul className="mt-3 space-y-2 text-xs text-slate-300">
                        {serviceQualification.allowedActions.map((action) => (
                          <li key={action}>{action.replaceAll('_', ' ')}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Avisos comerciais
                      </p>
                      <ul className="mt-3 space-y-2 text-xs text-amber-100/90">
                        {serviceQualification.salesWarnings.slice(0, 3).map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {preProposal && (
                <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/5 p-5">
                  <div className="flex flex-col gap-4 border-b border-white/5 pb-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                        Pré-proposta com segurança jurídica
                      </p>
                      <h4 className="mt-2 text-lg font-black text-white">{preProposal.title}</h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                          ID {preProposal.id}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${preProposalRiskTone}`}>
                          Risco {preProposal.riskLevel}
                        </span>
                        <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
                          Prontidão {preProposal.readinessScore}%
                        </span>
                        {preProposalValidUntil && (
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                            Válido até {preProposalValidUntil}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={preProposal.nextRoute}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
                    >
                      {preProposal.ctaLabel}
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Checklist documental
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {preProposal.documentChecklist.slice(0, 6).map((document) => (
                          <div key={document.code} className="rounded-2xl border border-white/5 bg-[#090d16] p-3">
                            <p className="text-xs font-bold leading-relaxed text-white">{document.label}</p>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                              {document.source.replaceAll('_', ' ')} • {document.required ? 'Obrigatório' : 'Opcional'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Gate comercial
                      </p>
                      {(preProposal.blockingReasons.length > 0 || preProposal.reviewReasons.length > 0) && (
                        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                          <p className="text-xs font-bold leading-relaxed text-amber-50">
                            {preProposal.checkoutAllowed
                              ? 'Proposta assistida habilitada com revisão CRC.'
                              : 'Checkout automático bloqueado até fechamento do dossiê.'}
                          </p>
                          <p className="mt-2 text-[11px] leading-relaxed text-amber-100/80">
                            Regras: {[...preProposal.blockingReasons, ...preProposal.reviewReasons].slice(0, 4).join(', ')}.
                          </p>
                        </div>
                      )}
                      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Termos de controle
                      </p>
                      <ul className="mt-3 space-y-2 text-xs leading-relaxed text-cyan-50/90">
                        {preProposal.legalTerms.slice(0, 3).map((term) => (
                          <li key={term}>{term}</li>
                        ))}
                      </ul>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Recalcular se houver
                      </p>
                      <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                        {preProposal.refreshTriggers.slice(0, 2).map((trigger) => (
                          <li key={trigger}>{trigger}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {auditLines.length > 0 && (
                <div className="rounded-[2rem] border border-white/5 bg-[#0d1320] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="text-emerald-400" size={18} />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Memória de cálculo
                    </p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {auditLines.slice(0, 6).map((line) => (
                      <div key={line.code} className="rounded-2xl border border-white/5 bg-[#090d16] p-4">
                        <p className="text-sm font-black text-white">{line.title}</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                          {line.formula}
                        </p>
                        <p className="mt-3 text-xs font-black text-emerald-200">
                          Resultado: {line.result}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[2rem] border border-white/5 bg-[#0d1320] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="text-blue-400" size={18} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Comparação por regime
                  </p>
                </div>
                <div className="space-y-3">
                  {result.comparisons.map((comparison) => (
                    <div
                      key={comparison.model}
                      className={`rounded-2xl border p-4 ${comparison.model === bestModel ? 'border-emerald-500/30 bg-emerald-500/5' : comparison.eligibilityStatus === 'INELIGIBLE' || comparison.eligibilityStatus === 'REQUIRES_REVIEW' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5 bg-[#090d16]'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                            {comparison.model.replace('_', ' ')}
                          </p>
                          <p className="mt-2 text-xl font-black text-white">
                            {comparison.eligibilityStatus === 'INELIGIBLE' ||
                            comparison.eligibilityStatus === 'REQUIRES_REVIEW'
                              ? comparison.eligibilityStatus === 'INELIGIBLE'
                                ? 'Inelegível'
                                : 'Revisão'
                              : new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(comparison.estimatedTax)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                            líquida anual
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-200">
                            {comparison.eligibilityStatus === 'INELIGIBLE' ||
                            comparison.eligibilityStatus === 'REQUIRES_REVIEW'
                              ? 'Bloqueado'
                              : new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(comparison.netAnnualResult)}
                          </p>
                        </div>
                      </div>
                      {comparison.warnings.length > 0 && (
                        <p className="mt-3 text-xs leading-relaxed text-amber-100/80">
                          {comparison.warnings[0]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-[#0d1320] p-6 text-center text-sm text-slate-400">
              Defina o faturamento e execute a simulação para ver a recomendação tributária.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function resolvePreProposalRiskTone(
  riskLevel?: NonNullable<SimulationResponse['preProposal']>['riskLevel'],
) {
  if (riskLevel === 'CRITICAL') return 'border-rose-400/30 bg-rose-500/10 text-rose-100';
  if (riskLevel === 'HIGH') return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  if (riskLevel === 'MEDIUM') return 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100';
  return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'amber' | 'emerald' | 'rose';
}) {
  const tones = {
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-300',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    rose: 'border-rose-500/20 bg-rose-500/5 text-rose-300',
  } as const;

  return (
    <div className={`rounded-[1.5rem] border p-4 ${tones[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-4 text-xl font-black text-white">{value}</p>
    </div>
  );
}
