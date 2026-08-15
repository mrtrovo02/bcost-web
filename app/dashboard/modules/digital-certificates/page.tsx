'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  FileKey2,
  Fingerprint,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  AuditLogRecord,
  CertificateStatus,
  CreateDigitalCertificatePayload,
  digitalCertificatesApi,
  DigitalCertificateRecord,
  DigitalCertificatesListResponse,
} from '@/lib/api/digital-certificates';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

type CertificateFormState = {
  issuer: string;
  thumbprint: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  status: CertificateStatus;
};

const DEFAULT_FORM: CertificateFormState = {
  issuer: '',
  thumbprint: '',
  serialNumber: '',
  validFrom: '',
  validTo: '',
  status: 'ACTIVE',
};

function toDateInput(value?: string | null) {
  if (!value) return '';

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function fromDateInput(value: string, endOfDay = false) {
  if (!value) return '';

  return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}.000Z`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatJson(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '—';
  }

  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (value === 'ACTIVE') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (value === 'EXPIRED') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (value === 'REVOKED') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  return 'border-slate-200 bg-white text-slate-600';
}

function operationalStatusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (value === 'VALID') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (value === 'EXPIRING_SOON') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (value === 'EXPIRED') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (value === 'REVOKED') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  return 'border-slate-200 bg-white text-slate-600';
}

function operationalStatusLabel(status?: string | null) {
  const value = String(status || '').toUpperCase();

  const labels: Record<string, string> = {
    VALID: 'Válido',
    EXPIRING_SOON: 'A vencer',
    EXPIRED: 'Expirado',
    REVOKED: 'Revogado',
  };

  return labels[value] || value || '—';
}

function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'secondary' | 'danger' | 'success';
  type?: 'button' | 'submit';
}) {
  const classes = {
    default: 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${classes[variant]}`}
    >
      {children}
    </button>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'slate' | 'emerald' | 'amber' | 'red';
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm opacity-70">{label}</div>
          <div className="mt-2 text-3xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl bg-white/70 p-2">{icon}</div>
      </div>
    </div>
  );
}

export default function DigitalCertificatesEnterprisePage() {
  const [companyId, setCompanyId] = useState('');
  const [payload, setPayload] = useState<DigitalCertificatesListResponse | null>(null);
  const [selected, setSelected] = useState<DigitalCertificateRecord | null>(null);
  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [form, setForm] = useState<CertificateFormState>(DEFAULT_FORM);
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const items = payload?.items || [];
  const summary = payload?.summary;

  const canSubmit = useMemo(() => {
    return Boolean(form.issuer && form.validFrom && form.validTo);
  }, [form]);

  const loadAudits = useCallback(
    async (certificateId?: string, companyIdOverride?: string) => {
      const effectiveCompanyId = companyIdOverride || companyId;

      if (!effectiveCompanyId) {
        setAudits([]);
        return;
      }

      try {
        /**
         * Compatibilidade:
         * Alguns filtros do AuditController podem variar por DTO.
         * Então buscamos por module=digital-certificates e filtramos
         * por entityId no client quando necessário.
         */
        const response = await digitalCertificatesApi.audit(effectiveCompanyId, {
          limit: 50,
          module: 'digital-certificates',
        });

        const items = response.items || [];

        const filtered = certificateId
          ? items.filter((item) => item.entityId === certificateId)
          : items;

        setAudits(filtered.length > 0 ? filtered : items.slice(0, 10));
      } catch {
        setAudits([]);
      }
    },
    [companyId],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true);
        setMessage(null);

        const resolvedCompanyId = companyId || (await resolveEnterpriseCompanyIdWithFallback());
        setCompanyId(resolvedCompanyId);

        const response = await digitalCertificatesApi.list(resolvedCompanyId, {
          limit: 100,
          status: statusFilter,
          search,
        });

        setPayload(response);

        const nextSelected =
          response.items.find((item) => item.id === selected?.id) || response.items[0] || null;

        setSelected(nextSelected);

        if (nextSelected) {
          await loadAudits(nextSelected.id, resolvedCompanyId);
        } else {
          await loadAudits(undefined, resolvedCompanyId);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao carregar certificados',
          description:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar o módulo de certificados digitais.',
        });
      } finally {
        setLoading(false);
      }
    },
    [companyId, statusFilter, search, selected?.id, loadAudits],
  );

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  }, []);

  const fillFormForEdit = useCallback((cert: DigitalCertificateRecord) => {
    setEditingId(cert.id);
    setForm({
      issuer: cert.issuer || '',
      thumbprint: cert.thumbprint || '',
      serialNumber: cert.serialNumber || '',
      validFrom: toDateInput(cert.validFrom),
      validTo: toDateInput(cert.validTo),
      status: cert.status || 'ACTIVE',
    });
    setSelected(cert);
  }, []);

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !canSubmit) return;

      setActionLoading('submit');
      setMessage(null);

      const payloadToSend: CreateDigitalCertificatePayload = {
        issuer: form.issuer.trim(),
        thumbprint: form.thumbprint.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        validFrom: fromDateInput(form.validFrom),
        validTo: fromDateInput(form.validTo, true),
        status: form.status,
      };

      try {
        const response = editingId
          ? await digitalCertificatesApi.update(companyId, editingId, payloadToSend)
          : await digitalCertificatesApi.create(companyId, payloadToSend);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Operação concluída.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        resetForm();
        await load({ silent: true });

        if (response.item) {
          setSelected(response.item);
          await loadAudits(response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao salvar certificado',
          description:
            error instanceof Error ? error.message : 'Não foi possível salvar o certificado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, canSubmit, form, editingId, resetForm, load, loadAudits],
  );

  const revoke = useCallback(
    async (cert: DigitalCertificateRecord) => {
      if (!companyId) return;

      setActionLoading(`revoke:${cert.id}`);
      setMessage(null);

      try {
        const response = await digitalCertificatesApi.revoke(companyId, cert.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Certificado revogado.',
          description: response.audit?.recorded
            ? 'Revogação registrada em AuditLog.'
            : 'Revogação concluída, mas a auditoria retornou alerta.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelected(response.item);
          await loadAudits(response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao revogar certificado',
          description:
            error instanceof Error ? error.message : 'Não foi possível revogar o certificado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const remove = useCallback(
    async (cert: DigitalCertificateRecord) => {
      if (!companyId) return;

      setActionLoading(`delete:${cert.id}`);
      setMessage(null);

      try {
        const response = await digitalCertificatesApi.remove(companyId, cert.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Certificado removido.',
          description: response.audit?.recorded
            ? 'Exclusão registrada em AuditLog.'
            : 'Exclusão concluída, mas a auditoria retornou alerta.',
        });

        if (selected?.id === cert.id) {
          setSelected(null);
        }

        await load({ silent: true });
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao remover certificado',
          description:
            error instanceof Error ? error.message : 'Não foi possível remover o certificado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, selected?.id],
  );

  const selectCertificate = useCallback(
    async (cert: DigitalCertificateRecord) => {
      setSelected(cert);
      await loadAudits(cert.id);
    },
    [loadAudits],
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                <FileKey2 className="h-4 w-4" />
                Fiscal Trust Layer
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Certificados Digitais
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Gestão enterprise de metadados, validade, status operacional e auditoria de
                certificados digitais. Esta camada prepara o bCost para automação fiscal real com
                Receita/SEFAZ.
              </p>

              <div className="mt-3 text-xs text-slate-500">
                Empresa ativa:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {companyId || 'carregando...'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => load()} disabled={loading} variant="secondary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
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
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            label="Ativos"
            value={summary?.active ?? 0}
            tone="emerald"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <KpiCard
            label="A vencer"
            value={summary?.expiringSoon ?? 0}
            tone="amber"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <KpiCard
            label="Expirados"
            value={summary?.expired ?? 0}
            tone="red"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <KpiCard
            label="Revogados"
            value={summary?.revoked ?? 0}
            tone="slate"
            icon={<XCircle className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(400px,0.9fr)]">
          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                {editingId ? 'Editar certificado' : 'Cadastrar certificado'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cadastro de metadados compatível com o schema atual. Upload de PFX/senha será uma
                fase futura com armazenamento seguro.
              </p>

              <form onSubmit={submit} className="mt-5 grid gap-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Emissor</span>
                    <input
                      value={form.issuer}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          issuer: event.target.value,
                        }))
                      }
                      placeholder="Ex: AC Certisign RFB G5"
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Status</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as CertificateStatus,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="REVOKED">REVOKED</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Thumbprint</span>
                    <input
                      value={form.thumbprint}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          thumbprint: event.target.value,
                        }))
                      }
                      placeholder="Hash/identificador do certificado"
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Número de série</span>
                    <input
                      value={form.serialNumber}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          serialNumber: event.target.value,
                        }))
                      }
                      placeholder="Número de série"
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Válido de</span>
                    <input
                      type="date"
                      value={form.validFrom}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          validFrom: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Válido até</span>
                    <input
                      type="date"
                      value={form.validTo}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          validTo: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="success"
                    disabled={!canSubmit || actionLoading === 'submit'}
                  >
                    {actionLoading === 'submit' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="h-4 w-4" />
                    )}
                    {editingId ? 'Salvar alterações' : 'Cadastrar'}
                  </Button>

                  <Button
                    variant="secondary"
                    disabled={actionLoading === 'submit'}
                    onClick={resetForm}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Certificados cadastrados</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Controle operacional de validade, status e auditoria.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') load();
                        }}
                        placeholder="Buscar..."
                        className="w-52 rounded-2xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value as CertificateStatus | 'ALL')
                      }
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    >
                      <option value="ALL">Todos</option>
                      <option value="ACTIVE">Ativos</option>
                      <option value="EXPIRED">Expirados</option>
                      <option value="REVOKED">Revogados</option>
                    </select>

                    <Button variant="secondary" onClick={() => load()}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando certificados...
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-10 text-center">
                    <KeyRound className="mx-auto h-10 w-10 text-slate-300" />
                    <div className="mt-3 text-sm font-semibold text-slate-700">
                      Nenhum certificado cadastrado.
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Cadastre o primeiro certificado para habilitar a camada de confiança fiscal.
                    </div>
                  </div>
                ) : (
                  items.map((cert) => {
                    const busy = actionLoading?.endsWith(`:${cert.id}`);
                    const isSelected = selected?.id === cert.id;

                    return (
                      <article
                        key={cert.id}
                        className={`p-5 transition ${isSelected ? 'bg-purple-50/50' : 'bg-white'}`}
                      >
                        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
                          <button
                            type="button"
                            onClick={() => selectCertificate(cert)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                                  cert.status,
                                )}`}
                              >
                                {cert.status}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${operationalStatusClass(
                                  cert.operationalStatus,
                                )}`}
                              >
                                {operationalStatusLabel(cert.operationalStatus)}
                              </span>

                              {typeof cert.daysToExpire === 'number' && (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {cert.daysToExpire} dias
                                </span>
                              )}
                            </div>

                            <h3 className="mt-3 truncate text-base font-bold text-slate-950">
                              {cert.issuer}
                            </h3>

                            <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                              <span>Válido de {formatDate(cert.validFrom)}</span>
                              <span>Até {formatDate(cert.validTo)}</span>
                              <span className="truncate">Série: {cert.serialNumber || '—'}</span>
                              <span className="truncate">Thumbprint: {cert.thumbprint || '—'}</span>
                            </div>
                          </button>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => fillFormForEdit(cert)}
                            >
                              <Fingerprint className="h-4 w-4" />
                              Editar
                            </Button>

                            <Button
                              variant="danger"
                              disabled={busy || cert.status === 'REVOKED'}
                              onClick={() => revoke(cert)}
                            >
                              {actionLoading === `revoke:${cert.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              Revogar
                            </Button>

                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => remove(cert)}
                            >
                              {actionLoading === `delete:${cert.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Remover
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Detalhe do certificado</h2>
              <p className="mt-1 text-sm text-slate-500">
                Evidência operacional para suporte e auditoria.
              </p>

              {!selected ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Selecione um certificado para ver os detalhes.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                        selected.status,
                      )}`}
                    >
                      {selected.status}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${operationalStatusClass(
                        selected.operationalStatus,
                      )}`}
                    >
                      {operationalStatusLabel(selected.operationalStatus)}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Emissor
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-950">{selected.issuer}</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Dias para vencer</div>
                      <div className="mt-1 text-2xl font-bold text-slate-950">
                        {selected.daysToExpire ?? '—'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Criado em</div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">
                        {formatDate(selected.createdAt)}
                      </div>
                    </div>
                  </div>

                  <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                    {formatJson(selected)}
                  </pre>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Auditoria relacionada</h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimos eventos de certificados digitais.
              </p>

              <div className="mt-5 space-y-3">
                {audits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Nenhum evento de auditoria carregado.
                  </div>
                ) : (
                  audits.map((audit) => (
                    <div
                      key={audit.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                          {audit.module}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                          {audit.action}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {formatDate(audit.createdAt)}
                      </div>

                      <pre className="mt-3 max-h-44 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
                        {formatJson(audit.payload)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
