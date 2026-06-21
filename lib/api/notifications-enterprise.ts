'use strict';

import { api } from '@/services/api';

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

export const notificationsEnterpriseApi = {
  summary: async (companyId: string): Promise<NotificationsEnterpriseSummaryResponse> => {
    const response = await api.get<NotificationsEnterpriseSummaryResponse>(
      `/notifications/enterprise/summary/${companyId}`,
    );

    return response.data;
  },

  listNotifications: async (
    companyId: string,
    params: NotificationQuery = {},
  ): Promise<NotificationListResponse> => {
    const response = await api.get<NotificationListResponse>(
      `/notifications/enterprise/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createNotification: async (
    companyId: string,
    payload: CreateNotificationPayload,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
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
    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}/${notificationId}/read`,
    );

    return response.data;
  },

  markUnread: async (
    companyId: string,
    notificationId: string,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}/${notificationId}/unread`,
    );

    return response.data;
  },

  acknowledge: async (
    companyId: string,
    notificationId: string,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}/${notificationId}/acknowledge`,
    );

    return response.data;
  },

  archive: async (
    companyId: string,
    notificationId: string,
  ): Promise<ActionResponse<NotificationEnterpriseRecord>> => {
    const response = await api.post<ActionResponse<NotificationEnterpriseRecord>>(
      `/notifications/enterprise/${companyId}/${notificationId}/archive`,
    );

    return response.data;
  },

  listWebhooks: async (
    companyId: string,
    params: NotificationQuery = {},
  ): Promise<WebhookListResponse> => {
    const response = await api.get<WebhookListResponse>(
      `/webhooks/enterprise/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createWebhook: async (
    companyId: string,
    payload: CreateWebhookPayload,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
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
    const response = await api.post<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}/${webhookId}/enable`,
    );

    return response.data;
  },

  disableWebhook: async (
    companyId: string,
    webhookId: string,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
    const response = await api.post<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}/${webhookId}/disable`,
    );

    return response.data;
  },

  testWebhook: async (
    companyId: string,
    webhookId: string,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
    const response = await api.post<ActionResponse<WebhookEnterpriseRecord>>(
      `/webhooks/enterprise/${companyId}/${webhookId}/test`,
    );

    return response.data;
  },

  dispatchWebhook: async (
    companyId: string,
    payload: DispatchWebhookPayload,
  ): Promise<ActionResponse<WebhookEnterpriseRecord>> => {
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
    const response = await api.get<AuditLogListResponse>(
      `/audit/${companyId}${buildQuery({
        limit: 30,
        module,
      })}`,
    );

    return response.data;
  },
};
