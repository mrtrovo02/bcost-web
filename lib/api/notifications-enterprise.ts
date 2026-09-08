'use strict';

import { api, isDemoSession } from '@/services/api';
import { assertOperationalDemoFallbackEnabled, isDemoEntityId } from '@/lib/config/demo-policy';

export type NotificationType =
  | 'TAX_READY'
  | 'FACTOR_R_ALERT'
  | 'COMPLIANCE_ISSUE'
  | 'CERT_EXPIRATION'
  | 'PAYMENT_OVERDUE'
  | 'PREDICTIVE_CASHFLOW_ALERT'
  | 'DAS_OVERDUE'
  | 'SPED_DUE'
  | 'ECF_DUE'
  | 'ECAC_PENDENCY'
  | 'EMPLOYEE_DISMISSAL_DUE';

export type NotificationChannel = 'WEBSOCKET' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'WEBHOOK';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRY' | 'READ' | 'ARCHIVED';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type NotificationEnterpriseRecord = {
  id: string;
  companyId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  severity: NotificationSeverity;
  read: boolean;
  acknowledged: boolean;
  metadata?: unknown;
  createdAt?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedById?: string | null;
  operationalStatus?: string;
  [key: string]: unknown;
};

export type WebhookEnterpriseRecord = {
  id: string;
  companyId: string;
  url: string;
  events: string[];
  active: boolean;
  secretMasked?: string | null;
  createdAt?: string | null;
  operationalStatus?: string;
  [key: string]: unknown;
};

export type NotificationsSummary = {
  count: number;
  unread: number;
  read: number;
  acknowledged: number;
  pending: number;
  sent: number;
  failed: number;
  retry: number;
  archived: number;
  info: number;
  warning: number;
  critical: number;
  websocket: number;
  webhook: number;
  email: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byChannel: Record<string, number>;
  riskScore: number;
};

export type WebhooksSummary = {
  count: number;
  active: number;
  inactive: number;
  totalEventsSubscribed: number;
  events: Record<string, number>;
};

export type NotificationsEnterpriseSummaryResponse = {
  status: string;
  module: string;
  companyId: string;
  notifications: NotificationsSummary;
  webhooks: WebhooksSummary;
  generatedAt: string;
};

export type NotificationListResponse = {
  status: string;
  module: 'notifications';
  model: 'NotificationLog';
  companyId: string;
  items: NotificationEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: NotificationsSummary;
  generatedAt: string;
};

export type WebhookListResponse = {
  status: string;
  module: 'webhooks';
  model: 'WebhookConfig';
  companyId: string;
  items: WebhookEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: WebhooksSummary;
  generatedAt: string;
};

export type CreateNotificationPayload = {
  type?: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown>;
};

export type CreateWebhookPayload = {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
};

export type UpdateWebhookPayload = Partial<CreateWebhookPayload>;

export type DispatchWebhookPayload = {
  event: string;
  severity?: NotificationSeverity;
  title?: string;
  message?: string;
  payload?: Record<string, unknown>;
};

export type ActionResponse<T> = {
  status: string;
  message: string;
  companyId: string;
  item?: T;
  result?: unknown;
  deliveryLog?: NotificationEnterpriseRecord;
  totals?: Record<string, unknown>;
  results?: unknown[];
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type AuditLogRecord = {
  id: string;
  module?: string | null;
  action?: string | null;
  entity?: string | null;
  entityId?: string | null;
  payload?: unknown;
  createdAt?: string | null;
  [key: string]: unknown;
};

export type AuditLogListResponse = {
  items: AuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
  generatedAt: string;
};

export type NotificationQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  type?: NotificationType | 'ALL';
  channel?: NotificationChannel | 'ALL';
  status?: NotificationStatus | 'ALL';
  severity?: NotificationSeverity | 'ALL';
  read?: string;
  acknowledged?: string;
  active?: string;
  event?: string;
};

function buildQuery(params?: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '' || value === 'ALL') {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();

  return query ? `?${query}` : '';
}

type DemoNotificationsStore = {
  notifications: NotificationEnterpriseRecord[];
  webhooks: WebhookEnterpriseRecord[];
  audits: AuditLogRecord[];
};

const DEMO_STORE_VERSION = 'v1';

function shouldUseNotificationsDemo(companyId: string): boolean {
  if (!isDemoEntityId(companyId)) return false;

  const message =
    'Notificacoes demonstrativas indisponiveis e fallback demonstrativo desabilitado neste ambiente.';

  if (!isDemoSession()) {
    throw new Error(message);
  }

  assertOperationalDemoFallbackEnabled(message);

  return true;
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function storeKey(companyId: string): string {
  return `bcost:${DEMO_STORE_VERSION}:notifications-enterprise:${companyId}`;
}

function makeNotification(
  companyId: string,
  id: string,
  title: string,
  severity: NotificationSeverity,
  status: NotificationStatus,
  read: boolean,
): NotificationEnterpriseRecord {
  return {
    id,
    companyId,
    type: severity === 'CRITICAL' ? 'COMPLIANCE_ISSUE' : 'FACTOR_R_ALERT',
    title,
    message: 'Evento operacional demonstrativo para validação da camada de notificações.',
    channel: 'WEBSOCKET',
    status,
    severity,
    read,
    acknowledged: false,
    metadata: { source: 'demo', module: 'notifications-enterprise' },
    createdAt: addDays(id.endsWith('001') ? -2 : -1),
    sentAt: status === 'SENT' || status === 'READ' ? addDays(-1) : null,
    readAt: read ? addDays(0) : null,
    operationalStatus: status,
  };
}

function makeDemoStore(companyId: string): DemoNotificationsStore {
  const notifications = [
    makeNotification(
      companyId,
      'demo-notification-001',
      'Certificado digital vence em 15 dias',
      'WARNING',
      'SENT',
      false,
    ),
    makeNotification(
      companyId,
      'demo-notification-002',
      'Pendência crítica de compliance fiscal',
      'CRITICAL',
      'PENDING',
      false,
    ),
    makeNotification(
      companyId,
      'demo-notification-003',
      'Fator R acima do limite de atenção',
      'INFO',
      'READ',
      true,
    ),
  ];
  const webhooks: WebhookEnterpriseRecord[] = [
    {
      id: 'demo-webhook-001',
      companyId,
      url: 'https://example.com/bcost/webhook',
      events: ['webhook.test', 'compliance.issue.created', 'billing.plan.updated'],
      active: true,
      secretMasked: 'whsec_********demo',
      createdAt: addDays(-20),
      operationalStatus: 'ACTIVE',
    },
    {
      id: 'demo-webhook-002',
      companyId,
      url: 'https://example.com/bcost/audit',
      events: ['audit.signal.created'],
      active: false,
      secretMasked: 'whsec_********audit',
      createdAt: addDays(-10),
      operationalStatus: 'INACTIVE',
    },
  ];

  return { notifications, webhooks, audits: [] };
}

function readStore(companyId: string): DemoNotificationsStore {
  const fallback = makeDemoStore(companyId);
  if (!isBrowserRuntime()) return fallback;

  const raw = window.localStorage.getItem(storeKey(companyId));
  if (!raw) {
    writeStore(companyId, fallback);
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as DemoNotificationsStore;
    return {
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications
        : fallback.notifications,
      webhooks: Array.isArray(parsed.webhooks) ? parsed.webhooks : fallback.webhooks,
      audits: Array.isArray(parsed.audits) ? parsed.audits : [],
    };
  } catch {
    window.localStorage.removeItem(storeKey(companyId));
    writeStore(companyId, fallback);
    return fallback;
  }
}

function writeStore(companyId: string, store: DemoNotificationsStore): void {
  if (!isBrowserRuntime()) return;
  window.localStorage.setItem(storeKey(companyId), JSON.stringify(store));
}

function appendAudit(
  store: DemoNotificationsStore,
  companyId: string,
  module: 'notifications' | 'webhooks',
  action: string,
  entityId: string,
  payload?: unknown,
): void {
  store.audits.unshift({
    id: `demo-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    module,
    action,
    entity: module,
    entityId,
    payload,
    createdAt: nowIso(),
    companyId,
  });
  store.audits = store.audits.slice(0, 60);
}

function summarizeNotifications(items: NotificationEnterpriseRecord[]): NotificationsSummary {
  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byChannel: Record<string, number> = {};

  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    bySeverity[item.severity] = (bySeverity[item.severity] ?? 0) + 1;
    byChannel[item.channel] = (byChannel[item.channel] ?? 0) + 1;
  }

  const critical = bySeverity.CRITICAL ?? 0;
  const failed = byStatus.FAILED ?? 0;
  const pending = byStatus.PENDING ?? 0;

  return {
    count: items.length,
    unread: items.filter((item) => !item.read).length,
    read: items.filter((item) => item.read).length,
    acknowledged: items.filter((item) => item.acknowledged).length,
    pending,
    sent: byStatus.SENT ?? 0,
    failed,
    retry: byStatus.RETRY ?? 0,
    archived: byStatus.ARCHIVED ?? 0,
    info: bySeverity.INFO ?? 0,
    warning: bySeverity.WARNING ?? 0,
    critical,
    websocket: byChannel.WEBSOCKET ?? 0,
    webhook: byChannel.WEBHOOK ?? 0,
    email: byChannel.EMAIL ?? 0,
    byStatus,
    bySeverity,
    byChannel,
    riskScore: Math.max(0, 96 - critical * 12 - failed * 10 - pending * 3),
  };
}

function summarizeWebhooks(items: WebhookEnterpriseRecord[]): WebhooksSummary {
  const events: Record<string, number> = {};
  for (const item of items) {
    for (const event of item.events || []) events[event] = (events[event] ?? 0) + 1;
  }

  return {
    count: items.length,
    active: items.filter((item) => item.active).length,
    inactive: items.filter((item) => !item.active).length,
    totalEventsSubscribed: Object.values(events).reduce((sum, count) => sum + count, 0),
    events,
  };
}

function filterNotifications(
  items: NotificationEnterpriseRecord[],
  params: NotificationQuery,
): NotificationEnterpriseRecord[] {
  const term = params.search?.trim().toLowerCase();
  return items.filter((item) => {
    if (params.type && params.type !== 'ALL' && item.type !== params.type) return false;
    if (params.channel && params.channel !== 'ALL' && item.channel !== params.channel) return false;
    if (params.status && params.status !== 'ALL' && item.status !== params.status) return false;
    if (params.severity && params.severity !== 'ALL' && item.severity !== params.severity)
      return false;
    if (params.read === 'true' && !item.read) return false;
    if (params.read === 'false' && item.read) return false;
    if (!term) return true;
    return `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(term);
  });
}

function filterWebhooks(
  items: WebhookEnterpriseRecord[],
  params: NotificationQuery,
): WebhookEnterpriseRecord[] {
  const term = params.search?.trim().toLowerCase();
  return items.filter((item) => {
    if (params.active === 'true' && !item.active) return false;
    if (params.active === 'false' && item.active) return false;
    if (params.event && !item.events.includes(params.event)) return false;
    if (!term) return true;
    return `${item.url} ${item.events.join(' ')}`.toLowerCase().includes(term);
  });
}

function pageItems<T>(items: T[], params: NotificationQuery): T[] {
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 100;
  return items.slice(offset, offset + limit);
}

function actionResponse<T>(
  companyId: string,
  message: string,
  item?: T,
  extra?: Partial<ActionResponse<T>>,
): ActionResponse<T> {
  return {
    status: 'OK_DEMO',
    message,
    companyId,
    item,
    audit: { recorded: true },
    generatedAt: nowIso(),
    ...extra,
  };
}

function updateNotificationStatus(
  companyId: string,
  notificationId: string,
  patch: Partial<NotificationEnterpriseRecord>,
  action: string,
): ActionResponse<NotificationEnterpriseRecord> {
  const store = readStore(companyId);
  const current = store.notifications.find((item) => item.id === notificationId);
  if (!current) throw new Error(`Notificação demo não encontrada: ${notificationId}`);
  Object.assign(current, patch);
  appendAudit(store, companyId, 'notifications', action, notificationId, patch);
  writeStore(companyId, store);
  return actionResponse(companyId, 'Notificação demo atualizada.', current);
}

export const notificationsEnterpriseApi = {
  summary: async (companyId: string): Promise<NotificationsEnterpriseSummaryResponse> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      return {
        status: 'OK_DEMO',
        module: 'notifications-enterprise',
        companyId,
        notifications: summarizeNotifications(store.notifications),
        webhooks: summarizeWebhooks(store.webhooks),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<NotificationsEnterpriseSummaryResponse>(
      `/notifications/enterprise/summary/${companyId}`,
    );

    return response.data;
  },

  listNotifications: async (
    companyId: string,
    params: NotificationQuery = {},
  ): Promise<NotificationListResponse> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      const filtered = filterNotifications(store.notifications, params);
      const items = pageItems(filtered, params);
      return {
        status: 'OK_DEMO',
        module: 'notifications',
        model: 'NotificationLog',
        companyId,
        items,
        total: filtered.length,
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
        hasMore: (params.offset ?? 0) + (params.limit ?? 100) < filtered.length,
        summary: summarizeNotifications(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<NotificationListResponse>(
      `/notifications/enterprise/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createNotification: async (
    companyId: string,
    payload: CreateNotificationPayload,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      const item: NotificationEnterpriseRecord = {
        id: `demo-notification-${Date.now()}`,
        companyId,
        type: payload.type ?? 'COMPLIANCE_ISSUE',
        title: payload.title,
        message: payload.message,
        channel: payload.channel ?? 'WEBSOCKET',
        status: payload.status ?? 'PENDING',
        severity: payload.severity ?? 'WARNING',
        read: false,
        acknowledged: false,
        metadata: payload.metadata,
        createdAt: nowIso(),
        sentAt: null,
        readAt: null,
        operationalStatus: payload.status ?? 'PENDING',
      };
      store.notifications.unshift(item);
      appendAudit(store, companyId, 'notifications', 'create', item.id, payload);
      writeStore(companyId, store);
      return actionResponse(companyId, 'Notificação demo criada.', item);
    }

    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}`,
      payload,
    );

    return response.data;
  },

  markRead: async (
    companyId: string,
    notificationId: string,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      return updateNotificationStatus(
        companyId,
        notificationId,
        { read: true, status: 'READ', readAt: nowIso() },
        'mark-read',
      );
    }

    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}/${notificationId}/read`,
    );

    return response.data;
  },

  markUnread: async (
    companyId: string,
    notificationId: string,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      return updateNotificationStatus(
        companyId,
        notificationId,
        { read: false, status: 'SENT', readAt: null },
        'mark-unread',
      );
    }

    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}/${notificationId}/unread`,
    );

    return response.data;
  },

  acknowledge: async (
    companyId: string,
    notificationId: string,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      return updateNotificationStatus(
        companyId,
        notificationId,
        { acknowledged: true, acknowledgedAt: nowIso(), acknowledgedById: 'demo-user' },
        'acknowledge',
      );
    }

    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}/${notificationId}/acknowledge`,
    );

    return response.data;
  },

  archive: async (
    companyId: string,
    notificationId: string,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      return updateNotificationStatus(
        companyId,
        notificationId,
        { status: 'ARCHIVED', read: true, readAt: nowIso() },
        'archive',
      );
    }

    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}/${notificationId}/archive`,
    );

    return response.data;
  },

  listWebhooks: async (
    companyId: string,
    params: NotificationQuery = {},
  ): Promise<WebhookListResponse> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      const filtered = filterWebhooks(store.webhooks, params);
      const items = pageItems(filtered, params);
      return {
        status: 'OK_DEMO',
        module: 'webhooks',
        model: 'WebhookConfig',
        companyId,
        items,
        total: filtered.length,
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
        hasMore: (params.offset ?? 0) + (params.limit ?? 100) < filtered.length,
        summary: summarizeWebhooks(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<WebhookListResponse>(
      `/webhooks/enterprise/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createWebhook: async (
    companyId: string,
    payload: CreateWebhookPayload,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      const item: WebhookEnterpriseRecord = {
        id: `demo-webhook-${Date.now()}`,
        companyId,
        url: payload.url,
        events: payload.events,
        active: payload.active ?? true,
        secretMasked: payload.secret ? 'whsec_********custom' : 'whsec_********auto',
        createdAt: nowIso(),
        operationalStatus: payload.active === false ? 'INACTIVE' : 'ACTIVE',
      };
      store.webhooks.unshift(item);
      appendAudit(store, companyId, 'webhooks', 'create', item.id, payload);
      writeStore(companyId, store);
      return actionResponse(companyId, 'Webhook demo criado.', item);
    }

    const response = await api.post<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateWebhook: async (
    companyId: string,
    webhookId: string,
    payload: UpdateWebhookPayload,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      const current = store.webhooks.find((item) => item.id === webhookId);
      if (!current) throw new Error(`Webhook demo não encontrado: ${webhookId}`);
      Object.assign(current, payload, {
        operationalStatus:
          payload.active === undefined
            ? current.operationalStatus
            : payload.active
              ? 'ACTIVE'
              : 'INACTIVE',
      });
      appendAudit(store, companyId, 'webhooks', 'update', webhookId, payload);
      writeStore(companyId, store);
      return actionResponse(companyId, 'Webhook demo atualizado.', current);
    }

    const response = await api.patch<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}/${webhookId}`,
      payload,
    );

    return response.data;
  },

  enableWebhook: async (
    companyId: string,
    webhookId: string,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      return notificationsEnterpriseApi.updateWebhook(companyId, webhookId, { active: true });
    }

    const response = await api.post<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}/${webhookId}/enable`,
    );

    return response.data;
  },

  disableWebhook: async (
    companyId: string,
    webhookId: string,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      return notificationsEnterpriseApi.updateWebhook(companyId, webhookId, { active: false });
    }

    const response = await api.post<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}/${webhookId}/disable`,
    );

    return response.data;
  },

  testWebhook: async (
    companyId: string,
    webhookId: string,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      const current = store.webhooks.find((item) => item.id === webhookId);
      if (!current) throw new Error(`Webhook demo não encontrado: ${webhookId}`);
      appendAudit(store, companyId, 'webhooks', 'test', webhookId, { event: 'webhook.test' });
      writeStore(companyId, store);
      return actionResponse(companyId, 'Teste de webhook demo executado.', current, {
        result: { delivered: current.active, status: current.active ? 'DELIVERED' : 'SKIPPED' },
      });
    }

    const response = await api.post<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}/${webhookId}/test`,
    );

    return response.data;
  },

  dispatchWebhook: async (
    companyId: string,
    payload: DispatchWebhookPayload,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      const activeTargets = store.webhooks.filter(
        (item) => item.active && item.events.includes(payload.event),
      );
      appendAudit(store, companyId, 'webhooks', 'dispatch', 'bulk', payload);
      writeStore(companyId, store);
      return actionResponse<WebhookEnterpriseRecord>(
        companyId,
        'Evento demo despachado.',
        undefined,
        {
          totals: {
            delivered: activeTargets.length,
            failed: 0,
            skipped: store.webhooks.length - activeTargets.length,
          },
          results: activeTargets.map((item) => ({ webhookId: item.id, status: 'DELIVERED' })),
        },
      );
    }

    const response = await api.post<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}/dispatch`,
      payload,
    );

    return response.data;
  },

  audit: async (
    companyId: string,
    module: 'notifications' | 'webhooks',
  ): Promise<AuditLogListResponse> => {
    if (shouldUseNotificationsDemo(companyId)) {
      const store = readStore(companyId);
      const items = store.audits.filter((item) => item.module === module).slice(0, 30);
      return {
        items,
        total: items.length,
        limit: 30,
        offset: 0,
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<AuditLogListResponse>(
      `/audit/${companyId}${buildQuery({
        limit: 30,
        module,
      })}`,
    );

    return response.data;
  },
};
