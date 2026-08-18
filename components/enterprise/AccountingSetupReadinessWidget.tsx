'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { useCompany } from '@/app/context/CompanyContext';
import {
  AccountingSetupOperation,
  AccountingSetupReadinessInput,
  AccountingSetupReadinessResponse,
  accountingPlatformApi,
} from '@/lib/api/accounting-platform';

const OPERATION_LABEL: Record<AccountingSetupOperation, string> = {
  COMPANY_OPENING: 'Abertura de empresa',
  ACCOUNTING_MIGRATION: 'Migração contábil',
  MEI_TO_ME_MIGRATION: 'MEI para ME',
};

function statusClass(status: string) {
  if (status === 'PASS' || status === 'READY') {
    return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  }

  if (status === 'WARN' || status === 'REQUIRES_ACTION') {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  return 'border-red-100 bg-red-50 text-red-700';
}

function decisionClass(decision: AccountingSetupReadinessResponse['decision']) {
  if (decision === 'READY_FOR_ASSISTED_EXECUTION') {
    return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  }

  if (decision === 'REQUIRES_SETUP') {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  return 'border-red-100 bg-red-50 text-red-700';
}

export default function AccountingSetupReadinessWidget() {
  const { selectedCompany } = useCompany();
  const [readiness, setReadiness] = useState<AccountingSetupReadinessResponse | null>(null);
  const [input, setInput] = useState<AccountingSetupReadinessInput>({
    operation: 'COMPANY_OPENING',
    hasAuditEvidenceStore: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await accountingPlatformApi.setupReadiness({
          ...input,
          companyId: selectedCompany?.id,
          taxRegime: selectedCompany?.taxRegime,
          municipalityCode: input.municipalityCode,
        });

        if (mounted) setReadiness(response);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível avaliar setup e legalização.',
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [
    input,
    selectedCompany?.id,
    selectedCompany?.taxRegime,
  ]);

  function toggle(key: keyof AccountingSetupReadinessInput) {
    setInput((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-cyan-700">
            <Building2 className="h-4 w-4" />
            Setup e legalização
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            Readiness de abertura e migração
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Avalia documentos, CRC, órgãos oficiais, município e dossiê auditável antes de vender
            abertura, migração contábil ou transição MEI para ME como operação assistida.
          </p>
        </div>

        {readiness && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${decisionClass(readiness.decision)}`}>
            {readiness.score}% · {readiness.decision}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <label className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
          Operação
          <select
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400"
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                operation: event.target.value as AccountingSetupOperation,
              }))
            }
            value={input.operation}
          >
            {Object.entries(OPERATION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
          Município IBGE
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400"
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                municipalityCode: event.target.value,
              }))
            }
            placeholder="Ex: 3550308"
            value={input.municipalityCode ?? ''}
          />
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
          Empresa ativa
          <div className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
            {selectedCompany?.name ?? 'sem empresa ativa'}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        {[
          ['hasPartnerDocuments', 'Docs sócios'],
          ['hasAddressProof', 'Endereço'],
          ['hasViabilityCheck', 'Viabilidade'],
          ['hasCrcResponsible', 'CRC'],
          ['hasBackofficeOwner', 'Backoffice'],
          ['hasAuditEvidenceStore', 'Dossiê'],
          ['hasOfficialPortalAccess', 'Órgão oficial'],
          ['hasMunicipalCoverage', 'Município'],
          ['hasPreviousAccountingDocs', 'Contador anterior'],
          ['hasMeiDeregistrationEvidence', 'Desenq. MEI'],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-600"
          >
            <span>{label}</span>
            <input
              checked={Boolean(input[key as keyof AccountingSetupReadinessInput])}
              className="h-4 w-4 accent-cyan-600"
              onChange={() => toggle(key as keyof AccountingSetupReadinessInput)}
              type="checkbox"
            />
          </label>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Avaliando setup operacional...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" />
            Setup indisponível
          </div>
          <p className="mt-1">{error}</p>
        </div>
      ) : readiness ? (
        <div className="mt-6 grid gap-5">
          <div className="grid gap-3 xl:grid-cols-3">
            {readiness.stages.map((stage) => (
              <article key={stage.id} className={`rounded-2xl border p-4 ${statusClass(stage.status)}`}>
                <div className="text-xs font-black uppercase tracking-widest">{stage.owner}</div>
                <h3 className="mt-2 text-sm font-black">{stage.title}</h3>
                <p className="mt-2 text-xs font-bold">{stage.automationBoundary}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {readiness.gates.map((gate) => (
              <article key={gate.code} className={`rounded-2xl border p-4 text-xs ${statusClass(gate.status)}`}>
                <div className="flex items-center gap-2 font-black">
                  <CheckCircle2 className="h-4 w-4" />
                  {gate.label} · {gate.owner}
                </div>
                <p className="mt-2 leading-5">{gate.message}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Dependências oficiais
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600">
                {readiness.officialDependencies.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Próximas ações
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-600">
                {readiness.nextActions.slice(0, 4).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Guardrails
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-600">
                {readiness.guardrails.slice(0, 3).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
