import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { accountingApi } from '../accounting';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const apiPatchMock = vi.mocked(api.patch);
const apiDeleteMock = vi.mocked(api.delete);

describe('accountingApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('serves account plan and accounting entries locally for demo companies', async () => {
    const [plan, entries, locks] = await Promise.all([
      accountingApi.listAccountPlan('demo-001'),
      accountingApi.listEntries('demo-001'),
      accountingApi.listLocks('demo-001'),
    ]);

    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.summary.active).toBeGreaterThan(0);
    expect(entries.items.length).toBeGreaterThan(0);
    expect(entries.summary.balanced).toBe(true);
    expect(locks.items).toEqual([]);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps account plan and entry writes local in demo mode', async () => {
    const account = await accountingApi.createAccountPlan('demo-001', {
      code: '6.1.01',
      name: 'Despesa Demo',
      type: 'DESPESA',
      active: true,
    });

    const entry = await accountingApi.createEntry('demo-001', {
      date: '2026-08-23T00:00:00.000Z',
      description: 'Lançamento contábil demo',
      debitCode: account.item?.code || '6.1.01',
      creditCode: '1.1.02',
      amount: 1250,
      origin: 'MANUAL',
    });

    expect(account.item?.name).toBe('Despesa Demo');
    expect(entry.item?.amount).toBe(1250);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('keeps period lock and unlock local in demo mode', async () => {
    const lock = await accountingApi.lockPeriod('demo-001', {
      month: 8,
      year: 2026,
      lockedBy: 'demo-accountant',
    });
    const locksAfterLock = await accountingApi.listLocks('demo-001');
    const unlock = await accountingApi.unlockPeriod('demo-001', 8, 2026);
    const locksAfterUnlock = await accountingApi.listLocks('demo-001');

    expect(lock.item?.lockedBy).toBe('demo-accountant');
    expect(locksAfterLock.total).toBe(1);
    expect(unlock.item?.month).toBe(8);
    expect(locksAfterUnlock.total).toBe(0);
    expect(apiPatchMock).not.toHaveBeenCalled();
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend accounting endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'success',
        module: 'account-plan',
        model: 'AccountPlan',
        companyId: 'real-company',
        items: [],
        total: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
        summary: {
          count: 0,
          active: 0,
          inactive: 0,
          companySpecific: 0,
          global: 0,
          type: {},
        },
        generatedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    const response = await accountingApi.listAccountPlan('real-company');

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith('/accounting/enterprise/account-plan/real-company');
  });
});
