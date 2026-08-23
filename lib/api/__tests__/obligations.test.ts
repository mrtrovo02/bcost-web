import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { obligationsApi } from '../obligations';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  isDemoSession: vi.fn(() => true),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const apiPatchMock = vi.mocked(api.patch);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('obligationsApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    isDemoSessionMock.mockReturnValue(true);
  });

  it('serves fiscal and tax obligations locally for demo companies', async () => {
    const [tax, fiscal] = await Promise.all([
      obligationsApi.listTax('demo-001'),
      obligationsApi.listFiscal('demo-001'),
    ]);

    expect(tax.items.length).toBeGreaterThan(0);
    expect(tax.summary.count).toBe(tax.total);
    expect(fiscal.items.length).toBeGreaterThan(0);
    expect(fiscal.summary.count).toBe(fiscal.total);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps create, payment and evidence actions local in demo mode', async () => {
    const created = await obligationsApi.createTax('demo-001', {
      name: 'DAS Demo',
      dueDate: '2026-08-20T23:59:59.000Z',
      amount: 1200,
      status: 'PENDING',
    });

    expect(created.item?.status).toBe('PENDING');

    const paid = await obligationsApi.payTax('demo-001', created.item?.id || '');
    expect(paid.item?.status).toBe('PAID');

    const evidence = await obligationsApi.registerTaxEvidence('demo-001', created.item?.id || '', {
      fileUrl: 'demo://das.pdf',
      receiptCode: 'REC-DEMO-001',
      notes: 'Teste operacional',
    });

    expect(evidence.evidence?.integrityHash).toContain('REC-DEMO-001');
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it('keeps fiscal workflow actions local in demo mode', async () => {
    const created = await obligationsApi.createFiscal('demo-001', {
      type: 'DCTF',
      referenceMonth: 8,
      referenceYear: 2026,
      dueDate: '2026-09-15T23:59:59.000Z',
      status: 'PENDING',
    });

    const submitted = await obligationsApi.submitFiscal('demo-001', created.item?.id || '', {
      receiptCode: 'REC-FISCAL-DEMO',
      fileHash: 'HASH-FISCAL-DEMO',
    });
    const accepted = await obligationsApi.acceptFiscal('demo-001', created.item?.id || '');

    expect(submitted.item?.status).toBe('SUBMITTED');
    expect(accepted.item?.status).toBe('ACCEPTED');
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
