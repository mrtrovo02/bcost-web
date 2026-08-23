'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  BadgeCheck,
  Bell,
  CheckCircle2,
  CircleDot,
  Globe2,
  Loader2,
  Megaphone,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  Webhook,
} from 'lucide-react';

import {
  AuditLogRecord,
  CreateNotificationPayload,
  CreateWebhookPayload,
  DispatchWebhookPayload,
  NotificationChannel,
  NotificationEnterpriseRecord,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
  notificationsEnterpriseApi,
  NotificationsEnterpriseSummaryResponse,
  WebhookEnterpriseRecord,
} from '@/lib/api/notifications-enterprise';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

type WorkspaceMode = 'notifications' | 'webhooks';

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

type NotificationForm = {
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  severity: NotificationSeverity;
};

type WebhookForm = {
  url: string;
  events: string;
  secret: string;
  active: boolean;
};

type DispatchForm = {
  event: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  payload: string;
};

const DEFAULT_NOTIFICATION_FORM: NotificationForm = {
  title: '',
  message: '',
  type: 'COMPLIANCE_ISSUE',
  channel: 'WEBSOCKET',
  status: 'PENDING',
  severity: 'WARNING',
};

const DEFAULT_WEBHOOK_FORM: WebhookForm = {
  url: '',
  events: 'webhook.test\ncompliance.issue.created\nbilling.plan.updated',
  secret: '',
  active: true,
};

const DEFAULT_DISPATCH_FORM: DispatchForm = {
  event: 'compliance.issue.created',
  severity: 'WARNING',
  title: 'Compliance issue criado',
  message: 'Evento disparado pelo bCost Enterprise.',
  payload: JSON.stringify(
    {
      source: 'frontend',
      module: 'notifications-webhooks-enterprise',
    },
    null,
    2,
  ),
};

async function resolveCompanyId(): Promise<string> {
  return resolveEnterpriseCompanyIdWithFallback();
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Payload precisa ser um objeto JSON.');
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Payload JSON inválido.');
  }
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
  if (value === undefined || value === null || value === '') return '—';

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusClass(value?: string | boolean | null) {
  const normalized = String(value || '').toUpperCase();

  if (
    normalized === 'SENT' ||
    normalized === 'READ' ||
    normalized === 'INFO' ||
    normalized === 'ACTIVE' ||
    normalized === 'TRUE'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'PENDING' || normalized === 'RETRY' || normalized === 'WARNING') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'FAILED' || normalized === 'CRITICAL') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function riskTone(score: number) {
  if (score >= 90) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (score >= 70) return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-red-100 bg-red-50 text-red-700';
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
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
  type?: 'button' | 'submit';
}) {
  const variants = {
    default: 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${variants[variant]}`}
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
  tone: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple';
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    purple: 'border-purple-100 bg-purple-50 text-purple-700',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm opacity-70">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl bg-white/70 p-2">{icon}</div>
      </div>
    </div>
  );
}

export default function NotificationsEnterpriseWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [companyId, setCompanyId] = useState('');
  const [summary, setSummary] = useState<NotificationsEnterpriseSummaryResponse | null>(null);

  const [notifications, setNotifications] = useState<NotificationEnterpriseRecord[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEnterpriseRecord[]>([]);
  const [audits, setAudits] = useState<AuditLogRecord[]>([]);

  const [selectedNotification, setSelectedNotification] =
    useState<NotificationEnterpriseRecord | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEnterpriseRecord | null>(null);

  const [notificationForm, setNotificationForm] =
    useState<NotificationForm>(DEFAULT_NOTIFICATION_FORM);
  const [webhookForm, setWebhookForm] = useState<WebhookForm>(DEFAULT_WEBHOOK_FORM);
  const [dispatchForm, setDispatchForm] = useState<DispatchForm>(DEFAULT_DISPATCH_FORM);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | NotificationStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | NotificationSeverity>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | NotificationChannel>('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const isNotifications = mode === 'notifications';
  const isWebhooks = mode === 'webhooks';

  const notificationCanSubmit = useMemo(() => {
    return Boolean(notificationForm.title && notificationForm.message);
  }, [notificationForm]);

  const webhookCanSubmit = useMemo(() => {
    return Boolean(webhookForm.url && webhookForm.events.trim());
  }, [webhookForm]);

  const loadAudits = useCallback(
    async (companyIdOverride?: string, moduleOverride?: 'notifications' | 'webhooks') => {
      const effectiveCompanyId = companyIdOverride || companyId;
      const effectiveModule = moduleOverride || (isNotifications ? 'notifications' : 'webhooks');

      if (!effectiveCompanyId) {
        setAudits([]);
        return;
      }

      try {
        const response = await notificationsEnterpriseApi.audit(
          effectiveCompanyId,
          effectiveModule,
        );

        setAudits(response.items || []);
      } catch {
        setAudits([]);
      }
    },
    [companyId, isNotifications],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true);
        setMessage(null);

        const resolvedCompanyId = companyId || (await resolveCompanyId());
        setCompanyId(resolvedCompanyId);

        const [summaryResponse, notificationsResponse, webhooksResponse] = await Promise.all([
          notificationsEnterpriseApi.summary(resolvedCompanyId),
          notificationsEnterpriseApi.listNotifications(resolvedCompanyId, {
            limit: 100,
            search: isNotifications ? search : undefined,
            status: isNotifications ? statusFilter : undefined,
            severity: isNotifications ? severityFilter : undefined,
            channel: isNotifications ? channelFilter : undefined,
          }),
          notificationsEnterpriseApi.listWebhooks(resolvedCompanyId, {
            limit: 100,
            search: isWebhooks ? search : undefined,
            active: isWebhooks ? activeFilter : undefined,
          }),
        ]);

        setSummary(summaryResponse);
        setNotifications(notificationsResponse.items || []);
        setWebhooks(webhooksResponse.items || []);

        setSelectedNotification(
          notificationsResponse.items.find((item) => item.id === selectedNotification?.id) ||
            notificationsResponse.items[0] ||
            null,
        );

        setSelectedWebhook(
          webhooksResponse.items.find((item) => item.id === selectedWebhook?.id) ||
            webhooksResponse.items[0] ||
            null,
        );

        await loadAudits(resolvedCompanyId, isNotifications ? 'notifications' : 'webhooks');
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao carregar Notifications/Webhooks Enterprise',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setLoading(false);
      }
    },
    [
      companyId,
      isNotifications,
      isWebhooks,
      search,
      statusFilter,
      severityFilter,
      channelFilter,
      activeFilter,
      selectedNotification?.id,
      selectedWebhook?.id,
      loadAudits,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  const submitNotification = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !notificationCanSubmit) return;

      setActionLoading('create-notification');
      setMessage(null);

      try {
        const payload: CreateNotificationPayload = {
          title: notificationForm.title.trim(),
          message: notificationForm.message.trim(),
          type: notificationForm.type,
          channel: notificationForm.channel,
          status: notificationForm.status,
          severity: notificationForm.severity,
          metadata: {
            source: 'frontend',
            module: 'notifications-enterprise',
          },
        };

        const response = await notificationsEnterpriseApi.createNotification(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Notificação criada.',
          description: response.audit?.recorded
            ? 'Evento registrado no AuditLog.'
            : 'Operação concluída com alerta de auditoria.',
        });

        setNotificationForm(DEFAULT_NOTIFICATION_FORM);
        await load({ silent: true });

        if (response.item) setSelectedNotification(response.item);
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar notificação',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, notificationCanSubmit, notificationForm, load],
  );

  const notificationAction = useCallback(
    async (
      notification: NotificationEnterpriseRecord,
      action: 'read' | 'unread' | 'acknowledge' | 'archive',
    ) => {
      if (!companyId) return;

      setActionLoading(`${action}:${notification.id}`);
      setMessage(null);

      try {
        const response =
          action === 'read'
            ? await notificationsEnterpriseApi.markRead(companyId, notification.id)
            : action === 'unread'
              ? await notificationsEnterpriseApi.markUnread(companyId, notification.id)
              : action === 'acknowledge'
                ? await notificationsEnterpriseApi.acknowledge(companyId, notification.id)
                : await notificationsEnterpriseApi.archive(companyId, notification.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Notificação atualizada.',
          description: `Status: ${response.item?.status ?? '—'}`,
        });

        await load({ silent: true });

        if (response.item) setSelectedNotification(response.item);
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao atualizar notificação',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load],
  );

  const submitWebhook = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !webhookCanSubmit) return;

      setActionLoading('create-webhook');
      setMessage(null);

      try {
        const payload: CreateWebhookPayload = {
          url: webhookForm.url.trim(),
          events: webhookForm.events
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          secret: webhookForm.secret.trim() || undefined,
          active: webhookForm.active,
        };

        const response = await notificationsEnterpriseApi.createWebhook(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Webhook criado.',
          description: response.audit?.recorded
            ? 'Evento registrado no AuditLog.'
            : 'Operação concluída com alerta de auditoria.',
        });

        setWebhookForm(DEFAULT_WEBHOOK_FORM);
        await load({ silent: true });

        if (response.item) setSelectedWebhook(response.item);
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar webhook',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, webhookCanSubmit, webhookForm, load],
  );

  const toggleWebhook = useCallback(
    async (webhook: WebhookEnterpriseRecord) => {
      if (!companyId) return;

      setActionLoading(`toggle:${webhook.id}`);
      setMessage(null);

      try {
        const response = webhook.active
          ? await notificationsEnterpriseApi.disableWebhook(companyId, webhook.id)
          : await notificationsEnterpriseApi.enableWebhook(companyId, webhook.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Webhook atualizado.',
          description: response.item?.active ? 'Webhook ativo.' : 'Webhook inativo.',
        });

        await load({ silent: true });

        if (response.item) setSelectedWebhook(response.item);
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao atualizar webhook',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load],
  );

  const testWebhook = useCallback(
    async (webhook: WebhookEnterpriseRecord) => {
      if (!companyId) return;

      setActionLoading(`test:${webhook.id}`);
      setMessage(null);

      try {
        const response = await notificationsEnterpriseApi.testWebhook(companyId, webhook.id);

        setMessage({
          type: response.status === 'OK' ? 'success' : 'warning',
          title: response.message || 'Teste de webhook executado.',
          description: `Resultado: ${response.status}`,
        });

        await load({ silent: true });
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao testar webhook',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load],
  );

  const dispatchWebhook = useCallback(async () => {
    if (!companyId) return;

    setActionLoading('dispatch');
    setMessage(null);

    try {
      const payload: DispatchWebhookPayload = {
        event: dispatchForm.event.trim(),
        severity: dispatchForm.severity,
        title: dispatchForm.title.trim() || undefined,
        message: dispatchForm.message.trim() || undefined,
        payload: parseJsonObject(dispatchForm.payload),
      };

      const response = await notificationsEnterpriseApi.dispatchWebhook(companyId, payload);

      setMessage({
        type: response.audit?.recorded ? 'success' : 'warning',
        title: response.message || 'Evento disparado.',
        description: `Entregues: ${response.totals?.delivered ?? 0} | Falhas: ${response.totals?.failed ?? 0}`,
      });

      await load({ silent: true });
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao disparar evento',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, dispatchForm, load]);

  const riskScore = summary?.notifications.riskScore ?? 100;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                {isNotifications ? <Bell className="h-4 w-4" /> : <Webhook className="h-4 w-4" />}
                Notification & Integration Layer
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {isNotifications ? 'Notifications Enterprise' : 'Webhooks Enterprise'}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isNotifications
                  ? 'Central enterprise de alertas, leitura, acknowledge, auditoria e evidência operacional para os módulos fiscais, contábeis, financeiros, payroll e compliance.'
                  : 'Camada de integração por eventos para envio externo de alertas, compliance issues, billing events e automações do bCost.'}
              </p>

              <div className="mt-3 text-xs text-slate-500">
                Empresa ativa:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {companyId || 'carregando...'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isWebhooks && (
                <Button
                  variant="warning"
                  onClick={dispatchWebhook}
                  disabled={actionLoading === 'dispatch'}
                >
                  {actionLoading === 'dispatch' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Dispatch Event
                </Button>
              )}

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

        <div className="grid gap-4 md:grid-cols-6">
          <div className={`rounded-2xl border p-5 shadow-sm ${riskTone(riskScore)}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm opacity-70">Notification Score</div>
                <div className="mt-2 text-3xl font-black">{riskScore}</div>
              </div>
              <Activity className="h-7 w-7" />
            </div>
          </div>

          <KpiCard
            label="Unread"
            value={summary?.notifications.unread ?? 0}
            tone="amber"
            icon={<Bell className="h-5 w-5" />}
          />
          <KpiCard
            label="Sent"
            value={summary?.notifications.sent ?? 0}
            tone="emerald"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <KpiCard
            label="Failed"
            value={summary?.notifications.failed ?? 0}
            tone="red"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <KpiCard
            label="Webhooks"
            value={summary?.webhooks.count ?? 0}
            tone="purple"
            icon={<Webhook className="h-5 w-5" />}
          />
          <KpiCard
            label="Active Hooks"
            value={summary?.webhooks.active ?? 0}
            tone="blue"
            icon={<Globe2 className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <section className="flex flex-col gap-6">
            {isNotifications ? (
              <NotificationFormCard
                form={notificationForm}
                setForm={setNotificationForm}
                canSubmit={notificationCanSubmit}
                loading={actionLoading === 'create-notification'}
                onSubmit={submitNotification}
              />
            ) : (
              <>
                <WebhookFormCard
                  form={webhookForm}
                  setForm={setWebhookForm}
                  canSubmit={webhookCanSubmit}
                  loading={actionLoading === 'create-webhook'}
                  onSubmit={submitWebhook}
                />
                <DispatchFormCard
                  form={dispatchForm}
                  setForm={setDispatchForm}
                  loading={actionLoading === 'dispatch'}
                  onDispatch={dispatchWebhook}
                />
              </>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {isNotifications ? 'Notificações' : 'Webhooks cadastrados'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Gestão operacional com evidência auditável.
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

                    {isNotifications ? (
                      <>
                        <select
                          value={statusFilter}
                          onChange={(event) =>
                            setStatusFilter(event.target.value as 'ALL' | NotificationStatus)
                          }
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="ALL">Todos status</option>
                          <option value="PENDING">PENDING</option>
                          <option value="SENT">SENT</option>
                          <option value="READ">READ</option>
                          <option value="FAILED">FAILED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>

                        <select
                          value={severityFilter}
                          onChange={(event) =>
                            setSeverityFilter(event.target.value as 'ALL' | NotificationSeverity)
                          }
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="ALL">Todas severidades</option>
                          <option value="INFO">INFO</option>
                          <option value="WARNING">WARNING</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>

                        <select
                          value={channelFilter}
                          onChange={(event) =>
                            setChannelFilter(event.target.value as 'ALL' | NotificationChannel)
                          }
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="ALL">Todos canais</option>
                          <option value="WEBSOCKET">WEBSOCKET</option>
                          <option value="WEBHOOK">WEBHOOK</option>
                          <option value="EMAIL">EMAIL</option>
                          <option value="PUSH">PUSH</option>
                        </select>
                      </>
                    ) : (
                      <select
                        value={activeFilter}
                        onChange={(event) => setActiveFilter(event.target.value)}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="ALL">Todos</option>
                        <option value="true">Ativos</option>
                        <option value="false">Inativos</option>
                      </select>
                    )}

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
                    Carregando...
                  </div>
                ) : isNotifications ? (
                  notifications.length === 0 ? (
                    <EmptyState mode={mode} />
                  ) : (
                    notifications.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        selected={selectedNotification?.id === notification.id}
                        actionLoading={actionLoading}
                        onSelect={setSelectedNotification}
                        onAction={notificationAction}
                      />
                    ))
                  )
                ) : webhooks.length === 0 ? (
                  <EmptyState mode={mode} />
                ) : (
                  webhooks.map((webhook) => (
                    <WebhookRow
                      key={webhook.id}
                      webhook={webhook}
                      selected={selectedWebhook?.id === webhook.id}
                      actionLoading={actionLoading}
                      onSelect={setSelectedWebhook}
                      onToggle={toggleWebhook}
                      onTest={testWebhook}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Detalhe técnico</h2>
              <p className="mt-1 text-sm text-slate-500">
                Payload operacional para suporte, auditoria e governança.
              </p>

              <pre className="mt-5 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {formatJson(isNotifications ? selectedNotification : selectedWebhook)}
              </pre>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Auditoria relacionada</h2>
              <p className="mt-1 text-sm text-slate-500">Últimos eventos auditáveis do módulo.</p>

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

function NotificationFormCard({
  form,
  setForm,
  canSubmit,
  loading,
  onSubmit,
}: {
  form: NotificationForm;
  setForm: React.Dispatch<React.SetStateAction<NotificationForm>>;
  canSubmit: boolean;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Criar notificação</h2>
      <p className="mt-1 text-sm text-slate-500">
        Registro manual de alerta enterprise com AuditLog.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field
            label="Título"
            value={form.title}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
            placeholder="Alerta de compliance"
            span={2}
          />

          <SelectField
            label="Tipo"
            value={form.type}
            onChange={(value) =>
              setForm((current) => ({ ...current, type: value as NotificationType }))
            }
            options={[
              'COMPLIANCE_ISSUE',
              'CERT_EXPIRATION',
              'PAYMENT_OVERDUE',
              'FACTOR_R_ALERT',
              'TAX_READY',
              'DAS_OVERDUE',
              'SPED_DUE',
              'ECF_DUE',
            ]}
          />

          <SelectField
            label="Severidade"
            value={form.severity}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                severity: value as NotificationSeverity,
              }))
            }
            options={['INFO', 'WARNING', 'CRITICAL']}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField
            label="Canal"
            value={form.channel}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                channel: value as NotificationChannel,
              }))
            }
            options={['WEBSOCKET', 'WEBHOOK', 'EMAIL', 'PUSH']}
          />

          <SelectField
            label="Status"
            value={form.status}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                status: value as NotificationStatus,
              }))
            }
            options={['PENDING', 'SENT', 'FAILED', 'RETRY', 'READ', 'ARCHIVED']}
          />
        </div>

        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-700">Mensagem</span>
          <textarea
            rows={4}
            value={form.message}
            onChange={(event) =>
              setForm((current) => ({ ...current, message: event.target.value }))
            }
            className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
          />
        </label>

        <div className="flex justify-end">
          <Button type="submit" variant="success" disabled={!canSubmit || loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            Criar notificação
          </Button>
        </div>
      </form>
    </div>
  );
}

function WebhookFormCard({
  form,
  setForm,
  canSubmit,
  loading,
  onSubmit,
}: {
  form: WebhookForm;
  setForm: React.Dispatch<React.SetStateAction<WebhookForm>>;
  canSubmit: boolean;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Cadastrar webhook</h2>
      <p className="mt-1 text-sm text-slate-500">
        Endpoint externo para receber eventos assinados do bCost.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <Field
          label="URL"
          value={form.url}
          onChange={(value) => setForm((current) => ({ ...current, url: value }))}
          placeholder="https://exemplo.com/webhook/bcost"
        />

        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-700">Eventos, um por linha</span>
          <textarea
            rows={5}
            value={form.events}
            onChange={(event) => setForm((current) => ({ ...current, events: event.target.value }))}
            className="font-mono rounded-2xl border border-slate-200 px-3 py-2 text-xs leading-5 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
          />
        </label>

        <Field
          label="Secret opcional"
          value={form.secret}
          onChange={(value) => setForm((current) => ({ ...current, secret: value }))}
          placeholder="mínimo 16 caracteres ou vazio para gerar automaticamente"
        />

        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              setForm((current) => ({ ...current, active: event.target.checked }))
            }
          />
          Webhook ativo
        </label>

        <div className="flex justify-end">
          <Button type="submit" variant="success" disabled={!canSubmit || loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Webhook className="h-4 w-4" />
            )}
            Criar webhook
          </Button>
        </div>
      </form>
    </div>
  );
}

function DispatchFormCard({
  form,
  setForm,
  loading,
  onDispatch,
}: {
  form: DispatchForm;
  setForm: React.Dispatch<React.SetStateAction<DispatchForm>>;
  loading: boolean;
  onDispatch: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Dispatch de evento</h2>
      <p className="mt-1 text-sm text-slate-500">
        Dispare um evento para todos os webhooks ativos inscritos.
      </p>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Evento"
            value={form.event}
            onChange={(value) => setForm((current) => ({ ...current, event: value }))}
          />

          <SelectField
            label="Severidade"
            value={form.severity}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                severity: value as NotificationSeverity,
              }))
            }
            options={['INFO', 'WARNING', 'CRITICAL']}
          />
        </div>

        <Field
          label="Título"
          value={form.title}
          onChange={(value) => setForm((current) => ({ ...current, title: value }))}
        />

        <Field
          label="Mensagem"
          value={form.message}
          onChange={(value) => setForm((current) => ({ ...current, message: value }))}
        />

        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-700">Payload JSON</span>
          <textarea
            rows={7}
            value={form.payload}
            onChange={(event) =>
              setForm((current) => ({ ...current, payload: event.target.value }))
            }
            className="font-mono rounded-2xl border border-slate-200 px-3 py-2 text-xs leading-5 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
          />
        </label>

        <div className="flex justify-end">
          <Button variant="warning" onClick={onDispatch} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Disparar evento
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  span,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  span?: number;
}) {
  return (
    <label className={`grid gap-2 text-sm ${span === 2 ? 'lg:col-span-2' : ''}`}>
      <span className="font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ mode }: { mode: WorkspaceMode }) {
  return (
    <div className="p-10 text-center">
      {mode === 'notifications' ? (
        <Bell className="mx-auto h-10 w-10 text-slate-300" />
      ) : (
        <Webhook className="mx-auto h-10 w-10 text-slate-300" />
      )}
      <div className="mt-3 text-sm font-semibold text-slate-700">Nenhum registro encontrado.</div>
      <div className="mt-1 text-sm text-slate-500">
        {mode === 'notifications'
          ? 'Crie uma notificação ou aguarde eventos automáticos.'
          : 'Cadastre um webhook para receber eventos do bCost.'}
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  selected,
  actionLoading,
  onSelect,
  onAction,
}: {
  notification: NotificationEnterpriseRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (item: NotificationEnterpriseRecord) => void;
  onAction: (
    notification: NotificationEnterpriseRecord,
    action: 'read' | 'unread' | 'acknowledge' | 'archive',
  ) => void;
}) {
  const busy = (action: string) => actionLoading === `${action}:${notification.id}`;

  return (
    <article className={`p-5 transition ${selected ? 'bg-purple-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button
          type="button"
          onClick={() => onSelect(notification)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(notification.status)}`}
            >
              {notification.status}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(notification.severity)}`}
            >
              {notification.severity}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(notification.channel)}`}
            >
              {notification.channel}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(String(notification.read))}`}
            >
              {notification.read ? 'READ' : 'UNREAD'}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{notification.title}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>Criado em: {formatDate(notification.createdAt)}</span>
            <span>Tipo: {notification.type}</span>
            <span>{notification.message}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy('read')}
            onClick={() => onAction(notification, 'read')}
          >
            {busy('read') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Lida
          </Button>

          <Button
            variant="secondary"
            disabled={busy('unread')}
            onClick={() => onAction(notification, 'unread')}
          >
            {busy('unread') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CircleDot className="h-4 w-4" />
            )}
            Não lida
          </Button>

          <Button
            variant="success"
            disabled={busy('acknowledge')}
            onClick={() => onAction(notification, 'acknowledge')}
          >
            {busy('acknowledge') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="h-4 w-4" />
            )}
            Acknowledge
          </Button>

          <Button
            variant="danger"
            disabled={busy('archive')}
            onClick={() => onAction(notification, 'archive')}
          >
            {busy('archive') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Arquivar
          </Button>
        </div>
      </div>
    </article>
  );
}

function WebhookRow({
  webhook,
  selected,
  actionLoading,
  onSelect,
  onToggle,
  onTest,
}: {
  webhook: WebhookEnterpriseRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (item: WebhookEnterpriseRecord) => void;
  onToggle: (item: WebhookEnterpriseRecord) => void;
  onTest: (item: WebhookEnterpriseRecord) => void;
}) {
  const toggleBusy = actionLoading === `toggle:${webhook.id}`;
  const testBusy = actionLoading === `test:${webhook.id}`;

  return (
    <article className={`p-5 transition ${selected ? 'bg-purple-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button
          type="button"
          onClick={() => onSelect(webhook)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(webhook.operationalStatus || String(webhook.active))}`}
            >
              {webhook.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
              {webhook.events?.length || 0} eventos
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{webhook.url}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>Criado em: {formatDate(webhook.createdAt)}</span>
            <span>Secret: {webhook.secretMasked || '—'}</span>
            <span>{webhook.events?.join(', ')}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={webhook.active ? 'secondary' : 'success'}
            disabled={toggleBusy}
            onClick={() => onToggle(webhook)}
          >
            {toggleBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : webhook.active ? (
              <ToggleLeft className="h-4 w-4" />
            ) : (
              <ToggleRight className="h-4 w-4" />
            )}
            {webhook.active ? 'Desativar' : 'Ativar'}
          </Button>

          <Button variant="warning" disabled={testBusy} onClick={() => onTest(webhook)}>
            {testBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube2 className="h-4 w-4" />
            )}
            Testar
          </Button>
        </div>
      </div>
    </article>
  );
}
