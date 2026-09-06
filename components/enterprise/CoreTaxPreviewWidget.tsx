'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Loader2 } from 'lucide-react';
import { useCompany } from '@/app/context/CompanyContext';
import {
  MonthlyTaxGateParams,
  MonthlyTaxCloseResponse,
  MonthlyTaxClosurePreview,
  MonthlyTaxEvidenceStatus,
  MonthlyTaxPreviewGateStatus,
  coreTaxPreviewApi,
} from '@/lib/api/core-tax-preview';

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function gateClass(status: MonthlyTaxPreviewGateStatus) {
  if (status === 'PASS') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'WARN') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-red-100 bg-red-50 text-red-700';
}

function statusClass(status: MonthlyTaxClosurePreview['status']) {
  if (status === 'READY_TO_CLOSE') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'REQUIRES_ACTION') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-red-100 bg-red-50 text-red-700';
}

function artifactClass(status: MonthlyTaxEvidenceStatus) {
  if (status === 'READY') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'PENDING') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-red-100 bg-red-50 text-red-700';
}

export default function CoreTaxPreviewWidget() {
  const { selectedCompany } = useCompany();
  const [preview, setPreview] = useState<MonthlyTaxClosurePreview | null>(null);
  const [gateParams, setGateParams] = useState<MonthlyTaxGateParams>({
    hasRevenueReconciliation: true,
  });
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<MonthlyTaxCloseResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!selectedCompany?.id) {
        setPreview(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await coreTaxPreviewApi.monthlyClosurePreview(
          selectedCompany.id,
          gateParams,
        );
        if (mounted) {
          setPreview(response);
          setCloseResult(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar a prévia fiscal da competência.',
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
  }, [gateParams, selectedCompany?.id]);

  function toggleGate(key: keyof MonthlyTaxGateParams) {
    setCloseResult(null);
    setGateParams((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function closeMonth() {
    if (!selectedCompany?.id || !preview?.canClose) return;

    try {
      setClosing(true);
      setError(null);
      const result = await coreTaxPreviewApi.closeMonth(selectedCompany.id, gateParams);
      setCloseResult(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível fechar a competência fiscal.',
      );
    } finally {
      setClosing(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-700">
            <Calculator className="h-4 w-4" />
            bCost Core
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            Prévia produtiva de apuração mensal
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Estima DAS, RBT12, Fator R e alíquota efetiva, mas bloqueia o fechamento oficial quando
            faltam certificado, acesso ao portal ou revisão CRC.
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600">
          {selectedCompany?.name ?? 'sem empresa ativa'}
        </div>
      </div>

      <div className="mt-6 grid gap-2 md:grid-cols-4">
        {[
          ['hasRevenueReconciliation', 'Receitas reconciliadas'],
          ['hasDigitalCertificate', 'Certificado/procuração'],
          ['hasOfficialPortalAccess', 'Portal oficial'],
          ['hasCrcReview', 'Revisão CRC'],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-600"
          >
            <span>{label}</span>
            <input
              checked={Boolean(gateParams[key as keyof MonthlyTaxGateParams])}
              className="h-4 w-4 accent-blue-600"
              onChange={() => toggleGate(key as keyof MonthlyTaxGateParams)}
              type="checkbox"
            />
          </label>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando prévia fiscal...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" />
            Prévia fiscal indisponível
          </div>
          <p className="mt-1">{error}</p>
        </div>
      ) : preview ? (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <div className={`rounded-2xl border p-4 text-xs ${statusClass(preview.status)}`}>
              <div className="text-lg font-black">{preview.status}</div>
              <div className="font-bold">fechamento</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
              <div className="text-lg font-black text-slate-950">
                {money(preview.calculation.taxAmount)}
              </div>
              <div className="font-bold text-slate-500">DAS estimado</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
              <div className="text-lg font-black text-slate-950">
                {preview.calculation.factorR}%
              </div>
              <div className="font-bold text-slate-500">Fator R</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
              <div className="text-lg font-black text-slate-950">
                Anexo {preview.calculation.appliedAnexo}
              </div>
              <div className="font-bold text-slate-500">aplicado</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
              <div className="text-lg font-black text-slate-950">
                {preview.calculation.effectiveRate}%
              </div>
              <div className="font-bold text-slate-500">alíquota efetiva</div>
            </div>
          </div>

          <div
            className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
              preview.canClose
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-red-100 bg-red-50 text-red-700'
            }`}
          >
            {preview.canClose
              ? 'Fechamento oficial liberado para gerar obrigação DAS e snapshot fiscal.'
              : 'Fechamento oficial bloqueado até resolver os gates obrigatórios.'}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!preview.canClose || closing}
              onClick={closeMonth}
              type="button"
            >
              {closing ? 'Fechando...' : 'Fechar competência'}
            </button>
            {closeResult && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                Fechamento registrado com protocolo auditável.
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {preview.gates.map((gate) => (
              <div key={gate.code} className={`rounded-xl border p-4 text-xs ${gateClass(gate.status)}`}>
                <div className="flex items-center gap-2 font-black">
                  <CheckCircle2 className="h-4 w-4" />
                  {gate.label}
                </div>
                <p className="mt-2 leading-5">{gate.message}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Protocolo auditável
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-slate-700">
                  {preview.evidencePacket.closureProtocol}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  Pacote {preview.evidencePacket.id}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] font-bold text-slate-600">
                {preview.evidencePacket.integrityHash.slice(0, 16)}
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {preview.evidencePacket.requiredArtifacts.slice(0, 8).map((artifact) => (
                <div
                  key={artifact.code}
                  className={`rounded-xl border px-3 py-3 text-xs ${artifactClass(artifact.status)}`}
                >
                  <div className="font-black">{artifact.label}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase">
                    {artifact.status} / {artifact.source}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {closeResult && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-black">Competência fechada com trilha auditável</div>
                  <div className="mt-1 text-xs font-semibold">
                    Obrigação {closeResult.obligation.name} criada com snapshot {closeResult.snapshotId}.
                  </div>
                  <div className="mt-2 font-mono text-[11px] font-bold">
                    {closeResult.auditTrail.closureProtocol}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 font-mono text-[11px] font-bold text-emerald-700">
                  {closeResult.auditTrail.integrityHash.slice(0, 16)}
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold leading-5">
                {closeResult.officialEvidence.message}
              </p>
              {closeResult.officialEvidence.pendingArtifacts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {closeResult.officialEvidence.pendingArtifacts.map((artifact) => (
                    <span
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-[10px] font-black text-amber-700"
                      key={artifact}
                    >
                      {artifact}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {preview.nextActions.length > 0 && (
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Próximas ações
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-600">
                {preview.nextActions.slice(0, 4).map((action) => (
                  <div key={action}>{action}</div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          Selecione uma empresa para avaliar a competência fiscal.
        </div>
      )}
    </section>
  );
}
