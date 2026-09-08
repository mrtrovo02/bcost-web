import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { financeOperationsEnterpriseApi } from '../finance-operations-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
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
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('financeOperationsEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    isDemoSessionMock.mockReturnValue(false);
  });

  it('serves finance operations locally for explicit demo sessions', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const [summary, receivables, payables, cashflow, timeline] = await Promise.all([
      financeOperationsEnterpriseApi.summary('demo-001'),
      financeOperationsEnterpriseApi.receivables('demo-001'),
      financeOperationsEnterpriseApi.payables('demo-001'),
      financeOperationsEnterpriseApi.cashflow('demo-001'),
      financeOperationsEnterpriseApi.timeline('demo-001'),
    ]);

    expect(summary.executiveSummary.receivables.count).toBeGreaterThan(0);
    expect(summary.executiveSummary.payables.count).toBeGreaterThan(0);
    expect(receivables.items.length).toBeGreaterThan(0);
    expect(payables.items.length).toBeGreaterThan(0);
    expect(cashflow.cashItems.length).toBeGreaterThan(0);
    expect(timeline.items.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('blocks stale demo company ids outside explicit demo sessions', async () => {
    await expect(financeOperationsEnterpriseApi.summary('demo-001')).rejects.toThrow(
      'Operacoes financeiras demonstrativas indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
    );

    await expect(financeOperationsEnterpriseApi.cashflow('demo-001')).rejects.toThrow(
      'Operacoes financeiras demonstrativas indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
    );

    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        module: 'finance-operations',
        companyId: 'real-company',
        company: {},
        executiveSummary: {
          financeScore: 100,
          financeStatus: 'HEALTHY',
          receivables: emptySummary(),
          payables: emptySummary(),
          cashflow: {
            cashIn: 0,
            cashOut: 0,
            netCash: 0,
            receivableOpen: 0,
            payableOpen: 0,
            projectedNet: 0,
            riskStatus: 'HEALTHY',
          },
          totalOpenAmount: 0,
          totalOverdueAmount: 0,
          totalOverdueCount: 0,
        },
        aging: {
          receivables: emptyAging(),
          payables: emptyAging(),
        },
        lists: {
          receivables: [],
          payables: [],
          cashItems: [],
        },
        supportingData: {
          sourceCounts: {},
        },
        generatedAt: '2026-08-23T00:00:00.000Z',
      },
    });

    const response = await financeOperationsEnterpriseApi.summary('real-company');

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith(
      '/finance/operations/real-company?limit=50&includeRaw=false',
    );
  });

  it('does not fallback to demo finance data for real companies', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 503 } });

    await expect(financeOperationsEnterpriseApi.summary('real-company')).rejects.toMatchObject({
      response: { status: 503 },
    });
  });
});

function emptySummary() {
  return {
    count: 0,
    totalAmount: 0,
    openAmount: 0,
    overdueAmount: 0,
    dueSoonAmount: 0,
    settledAmount: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    openCount: 0,
    settledCount: 0,
  };
}

function emptyAging() {
  return {
    current: { count: 0, amount: 0 },
    dueSoon7: { count: 0, amount: 0 },
    overdue1To7: { count: 0, amount: 0 },
    overdue8To30: { count: 0, amount: 0 },
    overdue31To60: { count: 0, amount: 0 },
    overdue61Plus: { count: 0, amount: 0 },
  };
}
