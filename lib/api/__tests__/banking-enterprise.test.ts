import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { bankingEnterpriseApi } from '../banking-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
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
const apiPatchMock = vi.mocked(api.patch);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('bankingEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    isDemoSessionMock.mockReturnValue(false);
    window.localStorage.clear();
  });

  it('serves banking summary, accounts and transactions locally', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const [summary, accounts, transactions] = await Promise.all([
      bankingEnterpriseApi.summary('demo-001'),
      bankingEnterpriseApi.listAccounts('demo-001'),
      bankingEnterpriseApi.listTransactions('demo-001'),
    ]);

    expect(summary.accounts.count).toBeGreaterThan(0);
    expect(summary.transactions.count).toBeGreaterThan(0);
    expect(accounts.items.length).toBeGreaterThan(0);
    expect(transactions.items.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps account and transaction writes local in demo mode', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const account = await bankingEnterpriseApi.createAccount('demo-001', {
      bankName: 'Banco Demo',
      agency: '0001',
      account: '99999-9',
      balanceCache: 1000,
    });

    const transaction = await bankingEnterpriseApi.createTransaction('demo-001', {
      bankAccountId: account.item?.id || '',
      type: 'CREDIT',
      amount: 4500,
      description: 'Recebimento demo',
      occurredAt: '2026-08-23T00:00:00.000Z',
    });

    expect(account.item?.bankName).toBe('Banco Demo');
    expect(transaction.item?.reconciled).toBe(false);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('keeps reconciliation workflow local in demo mode', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const transactions = await bankingEnterpriseApi.listTransactions('demo-001', {
      reconciled: 'false',
    });
    const transaction = transactions.items[0];

    const candidates = await bankingEnterpriseApi.candidates('demo-001', transaction.id);
    const reconciled = await bankingEnterpriseApi.manualReconcile('demo-001', {
      bankTransactionId: transaction.id,
      targetType: candidates.candidates[0]?.targetType || 'INVOICE',
      targetId: candidates.candidates[0]?.targetId || 'demo-target',
      force: true,
    });
    const undone = await bankingEnterpriseApi.undoReconciliation('demo-001', transaction.id);

    expect(candidates.candidates.length).toBeGreaterThan(0);
    expect(reconciled.item?.reconciled).toBe(true);
    expect(undone.item?.reconciled).toBe(false);
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it('blocks stale demo company ids outside explicit demo sessions', async () => {
    await expect(bankingEnterpriseApi.summary('demo-001')).rejects.toThrow(
      'Banking demonstrativo indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );

    await expect(
      bankingEnterpriseApi.createAccount('demo-001', {
        bankName: 'Banco Demo',
        agency: '0001',
        account: '99999-9',
        balanceCache: 1000,
      }),
    ).rejects.toThrow(
      'Banking demonstrativo indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );

    expect(apiGetMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend banking endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'success',
        module: 'banking-enterprise-summary',
        companyId: 'real-company',
        accounts: {
          count: 0,
          active: 0,
          deleted: 0,
          totalBalance: 0,
          byBank: {},
        },
        transactions: {
          count: 0,
          credits: 0,
          debits: 0,
          totalCredit: 0,
          totalDebit: 0,
          netAmount: 0,
          reconciled: 0,
          pending: 0,
          reconciliationRate: 0,
          byType: {},
          byStatus: {},
          byBankAccountId: {},
        },
        generatedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    const response = await bankingEnterpriseApi.summary('real-company');

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith('/banking/enterprise/summary/real-company');
  });
});
