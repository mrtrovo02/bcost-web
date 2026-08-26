import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { automationJobsApi } from '../automation-jobs';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);

describe('automationJobsApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves list and detail locally for demo companies when fallback is disabled', async () => {
    const list = await automationJobsApi.list('demo-001', { limit: 20, type: 'ALL' });
    const detail = await automationJobsApi.detail('demo-001', list.items[0]?.id || 'job-001');

    expect(list.items.length).toBeGreaterThan(0);
    expect(list.companyId).toBe('demo-001');
    expect(detail.job.id).toBe(list.items[0]?.id);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('serves retry, cancel and acknowledge actions locally for demo job ids', async () => {
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
});
