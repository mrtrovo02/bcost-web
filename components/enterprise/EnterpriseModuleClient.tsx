'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Database,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

import { BcostSchemaModule } from '@/lib/product/schema-modules';
import {
  EnterpriseModulePayload,
  getEnterpriseEndpointStrategy,
  enterpriseApi,
} from '@/lib/api/enterprise';

type Props = {
  module: BcostSchemaModule;
};

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Ativo';
  if (status === 'INTEGRATING') return 'Em integração';
  return 'Planejado';
}

function statusClass(status: string) {
  if (status === 'ACTIVE') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }

  if (status === 'INTEGRATING') {
    return 'bg-blue-50 text-blue-700 border-blue-100';
  }

  return 'bg-slate-50 text-slate-500 border-slate-100';
}

function priorityClass(priority: string) {
  if (priority === 'CRITICAL') {
    return 'bg-red-50 text-red-700 border-red-100';
  }

  if (priority === 'HIGH') {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }

  if (priority === 'MEDIUM') {
    return 'bg-violet-50 text-violet-700 border-violet-100';
  }

  return 'bg-slate-50 text-slate-500 border-slate-100';
}

function getStoredCompanyId() {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    localStorage.getItem('bcost_company_id') ||
    localStorage.getItem('bcost_active_company') ||
    localStorage.getItem('companyId') ||
    null
  );
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function recordTitle(record: unknown, index: number) {
  if (!record || typeof record !== 'object') {
    return `Registro ${index + 1}`;
  }

  const item = record as Record<string, unknown>;

  return String(
    item.name ||
      item.title ||
      item.description ||
      item.email ||
      item.cnpj ||
      item.document ||
      item.id ||
      `Registro ${index + 1}`,
  );
}

function recordSubtitle(record: unknown) {
  if (!record || typeof record !== 'object') {
    return '';
  }

  const item = record as Record<string, unknown>;

  return String(
    item.status ||
      item.role ||
      item.type ||
      item.companyId ||
      item.generatedAt ||
      item.createdAt ||
      '',
  );
}

export default function EnterpriseModuleClient({ module }: Props) {
  const strategy = useMemo(() => getEnterpriseEndpointStrategy(module.slug), [module.slug]);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [payload, setPayload] = useState<EnterpriseModulePayload | null>(null);
  const [loading, setLoading] = useState(module.status !== 'PLANNED');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const activeCompanyId = getStoredCompanyId();
    setCompanyId(activeCompanyId);
    setError('');

    if (module.status === 'PLANNED' && !strategy?.enabled) {
      setPayload({
        slug: module.slug,
        title: module.title,
        status: module.status,
        endpoint: module.apiBase ?? null,
        connected: false,
        records: [],
        summary: {},
        raw: null,
        message:
          'Módulo já exposto no frontend. A próxima etapa é criar endpoints, serviço e CRUD completo.',
        generatedAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await enterpriseApi.getModuleData(module, activeCompanyId);
      setPayload(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar módulo enterprise.';

      setError(message);
      setPayload({
        slug: module.slug,
        title: module.title,
        status: module.status,
        endpoint: strategy?.path ?? module.apiBase ?? null,
        connected: false,
        records: [],
        summary: {},
        raw: null,
        message,
        generatedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [module, strategy]);

  useEffect(() => {
    void load();
  }, [load]);

  const records = payload?.records ?? [];
  const connected = Boolean(payload?.connected);

  return (
    <div className="min-h-screen bg-[#fcfdfe] p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/enterprise"
          className="text-sm font-black uppercase tracking-widest text-blue-600"
        >
          ← Voltar para Enterprise Coverage
        </Link>
      </div>

      <section className="rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl">
        <div className="flex flex-wrap gap-3">
          <span
            className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] ${statusClass(
              module.status,
            )}`}
          >
            {statusLabel(module.status)}
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-300">
            {module.area}
          </span>

          <span
            className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] ${priorityClass(
              module.priority,
            )}`}
          >
            {module.priority}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <h1 className="text-5xl font-black tracking-tighter">{module.title}</h1>

            <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-blue-300">
              Schema model: {module.model}
            </p>

            <p className="mt-6 max-w-4xl text-sm leading-7 text-slate-300">{module.description}</p>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                Valor comercial
              </p>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-200">
                {module.commercialValue}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3">
              {connected ? (
                <CheckCircle2 className="text-emerald-300" size={26} />
              ) : module.status === 'PLANNED' ? (
                <Clock className="text-slate-400" size={26} />
              ) : (
                <AlertCircle className="text-amber-300" size={26} />
              )}

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Integração
                </p>
                <p className="mt-1 text-lg font-black">
                  {connected ? 'Conectado' : module.status === 'PLANNED' ? 'Planejado' : 'Pendente'}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <p>
                <strong className="text-white">Empresa ativa:</strong>{' '}
                {companyId || 'Não encontrada'}
              </p>
              <p>
                <strong className="text-white">Endpoint:</strong>{' '}
                {payload?.endpoint || strategy?.path || module.apiBase || 'A definir'}
              </p>
              <p>
                <strong className="text-white">Registros:</strong> {records.length}
              </p>
            </div>

            <button
              onClick={() => void load()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-500"
            >
              <RefreshCw size={16} />
              Atualizar módulo
            </button>
          </div>
        </div>
      </section>

      {error && (
        <section className="mt-8 rounded-[2rem] border border-amber-100 bg-amber-50 p-6">
          <div className="flex gap-3">
            <AlertCircle className="mt-1 text-amber-700" size={22} />
            <div>
              <h2 className="font-black text-amber-900">Integração ainda não disponível</h2>
              <p className="mt-2 text-sm leading-6 text-amber-800">{error}</p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm xl:col-span-2">
          <div className="flex items-center gap-3">
            <Database className="text-blue-600" size={24} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Dados do módulo
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-tighter text-slate-900">
                Consulta operacional
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 rounded-3xl bg-slate-50 p-10 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Carregando módulo...
              </p>
            </div>
          ) : records.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-4">
              {records.slice(0, 10).map((record, index) => (
                <details
                  key={`${module.slug}-${index}`}
                  className="group rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900">{recordTitle(record, index)}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {recordSubtitle(record)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Ver JSON
                      </span>
                    </div>
                  </summary>

                  <pre className="mt-5 max-h-80 overflow-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-200">
                    {formatJson(record)}
                  </pre>
                </details>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <Layers className="mx-auto text-slate-300" size={42} />
              <h3 className="mt-4 text-xl font-black text-slate-900">Nenhum registro encontrado</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {payload?.message ||
                  'Este módulo está pronto visualmente, mas ainda precisa de dados ou endpoint real.'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-600" size={24} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600">
                  KPIs do schema
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Indicadores</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {module.kpis.map((kpi) => (
                <div key={kpi} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-700">{kpi}</p>
                  <p className="mt-1 text-xs text-slate-400">Será alimentado pela API do módulo.</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Ações</p>

            <div className="mt-6 space-y-3">
              {module.mainActions.map((action) => (
                <div key={action} className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-sm font-bold text-slate-700">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
          Payload bruto
        </p>

        <pre className="mt-5 max-h-[520px] overflow-auto rounded-2xl bg-slate-950 p-6 text-xs leading-6 text-slate-200">
          {formatJson(payload?.raw ?? payload)}
        </pre>
      </section>
    </div>
  );
}
