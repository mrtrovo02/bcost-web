import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { automationJobsApi } from '../automation-jobs';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  assertOperationalDemoFallbackEnabled: vi.fn((message?: string) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK === 'false') {
      throw new Error(message || 'Fallback demonstrativo desabilitado.');
    }
  }),
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('automationJobsApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    isDemoSessionMock.mockReturnValue(false);
  });

  it('serves list and detail locally for explicit demo sessions', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const list = await automationJobsApi.list('demo-001', { limit: 20, type: 'ALL' });
    const detail = await automationJobsApi.detail('demo-001', list.items[0]?.id || 'job-001');

    expect(list.items.length).toBeGreaterThan(0);
    expect(list.companyId).toBe('demo-001');
    expect(detail.job.id).toBe(list.items[0]?.id);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('serves retry, cancel and acknowledge actions locally for demo job ids', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const [retry, cancel, acknowledge] = await Promise.all([
      automationJobsApi.retry('demo-001', 'job-001'),
      automationJobsApi.cancel('demo-001', 'job-002'),
      automationJobsApi.acknowledge('demo-001', 'job-003'),
    ]);

    expect(retry.applied).toBe(true);
    expect(retry.job.status).toBe('QUEUED');
    expect(cancel.job.status).toBe('CANCELLED');
    expect(acknowledge.job.status).toBe('COMPLETED');
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('blocks stale demo company ids outside explicit demo sessions', async () => {
    await expect(automationJobsApi.list('demo-001')).rejects.toThrow(
      'Automacoes demonstrativas indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
    );

    await expect(automationJobsApi.retry('demo-001', 'job-001')).rejects.toThrow(
      'Automacoes demonstrativas indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
    );

    expect(apiGetMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('keeps real jobs on backend action endpoints', async () => {
    apiPostMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        action: 'retry',
        jobId: 'real-job-uuid',
        companyId: 'real-company',
        applied: true,
        message: 'ok',
        job: {
          id: 'real-job-uuid',
          companyId: 'real-company',
          status: 'QUEUED',
        },
        generatedAt: '2026-08-23T00:00:00.000Z',
      },
    });

    const response = await automationJobsApi.retry('real-company', 'real-job-uuid');

    expect(response.jobId).toBe('real-job-uuid');
    expect(apiPostMock).toHaveBeenCalledWith('/automation/jobs/real-job-uuid/retry');
  });

  it('does not fallback to automation demo list for real companies', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 503 } });

    await expect(automationJobsApi.list('real-company')).rejects.toMatchObject({
      response: { status: 503 },
    });
  });

  it('does not mask real audit failures with an empty local response', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 503 } });

    await expect(automationJobsApi.audit('real-company')).rejects.toMatchObject({
      response: { status: 503 },
    });
  });
});
