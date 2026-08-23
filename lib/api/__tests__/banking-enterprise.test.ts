import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { bankingEnterpriseApi } from '../banking-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  isDemoSession: vi.fn(() => true),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isOperationalDemoFallbackEnabled: vi.fn(() => true),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const apiPatchMock = vi.mocked(api.patch);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('bankingEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    isDemoSessionMock.mockReturnValue(true);
  });

  it('serves banking summary, accounts and transactions locally', async () => {
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
});
