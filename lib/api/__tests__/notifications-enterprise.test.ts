import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { isOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';
import { notificationsEnterpriseApi } from '../notifications-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
  isOperationalDemoFallbackEnabled: vi.fn(() => false),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const apiPatchMock = vi.mocked(api.patch);
const isDemoSessionMock = vi.mocked(isDemoSession);
const isFallbackEnabledMock = vi.mocked(isOperationalDemoFallbackEnabled);

describe('notificationsEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    isDemoSessionMock.mockReturnValue(false);
    isFallbackEnabledMock.mockReturnValue(false);
  });

  it('serves summary, notifications, webhooks and audit locally for demo companies', async () => {
    const [summary, notifications, webhooks, audit] = await Promise.all([
      notificationsEnterpriseApi.summary('demo-001'),
      notificationsEnterpriseApi.listNotifications('demo-001'),
      notificationsEnterpriseApi.listWebhooks('demo-001'),
      notificationsEnterpriseApi.audit('demo-001', 'notifications'),
    ]);

    expect(summary.notifications.count).toBeGreaterThan(0);
    expect(summary.webhooks.count).toBeGreaterThan(0);
    expect(notifications.items.length).toBeGreaterThan(0);
    expect(webhooks.items.length).toBeGreaterThan(0);
    expect(audit.items).toEqual([]);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps notification writes and state transitions local in demo mode', async () => {
    const created = await notificationsEnterpriseApi.createNotification('demo-001', {
      title: 'Alerta demo',
      message: 'Mensagem demo',
      severity: 'WARNING',
    });
    const read = await notificationsEnterpriseApi.markRead('demo-001', created.item?.id || '');
    const unread = await notificationsEnterpriseApi.markUnread('demo-001', created.item?.id || '');
    const acknowledged = await notificationsEnterpriseApi.acknowledge(
      'demo-001',
      created.item?.id || '',
    );
    const archived = await notificationsEnterpriseApi.archive('demo-001', created.item?.id || '');

    expect(created.item?.title).toBe('Alerta demo');
    expect(read.item?.read).toBe(true);
    expect(unread.item?.read).toBe(false);
    expect(acknowledged.item?.acknowledged).toBe(true);
    expect(archived.item?.status).toBe('ARCHIVED');
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('keeps webhook workflow local in demo mode', async () => {
    const created = await notificationsEnterpriseApi.createWebhook('demo-001', {
      url: 'https://example.com/hooks/bcost',
      events: ['webhook.test', 'billing.plan.updated'],
      active: true,
    });
    const disabled = await notificationsEnterpriseApi.disableWebhook('demo-001', created.item?.id || '');
    const enabled = await notificationsEnterpriseApi.enableWebhook('demo-001', created.item?.id || '');
    const tested = await notificationsEnterpriseApi.testWebhook('demo-001', created.item?.id || '');
    const dispatched = await notificationsEnterpriseApi.dispatchWebhook('demo-001', {
      event: 'webhook.test',
      severity: 'INFO',
      payload: { ok: true },
    });

    expect(created.item?.active).toBe(true);
    expect(disabled.item?.active).toBe(false);
    expect(enabled.item?.active).toBe(true);
    expect(tested.result).toMatchObject({ status: 'DELIVERED' });
    expect(dispatched.totals?.delivered).toBeGreaterThan(0);
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        module: 'notifications-enterprise',
        companyId: 'real-company',
        notifications: emptyNotificationSummary(),
        webhooks: emptyWebhookSummary(),
        generatedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    const response = await notificationsEnterpriseApi.summary('real-company');

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith('/notifications/enterprise/summary/real-company');
  });
});

function emptyNotificationSummary() {
  return {
    count: 0,
    unread: 0,
    read: 0,
    acknowledged: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    retry: 0,
    archived: 0,
    info: 0,
    warning: 0,
    critical: 0,
    websocket: 0,
    webhook: 0,
    email: 0,
    byStatus: {},
    bySeverity: {},
    byChannel: {},
    riskScore: 100,
  };
}

function emptyWebhookSummary() {
  return {
    count: 0,
    active: 0,
    inactive: 0,
    totalEventsSubscribed: 0,
    events: {},
  };
}
