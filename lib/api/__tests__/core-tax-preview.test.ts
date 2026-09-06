import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { coreTaxPreviewApi } from '../core-tax-preview';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const apiPostMock = vi.mocked(api.post);

describe('coreTaxPreviewApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes the auditable tax closure response from the backend', async () => {
    apiPostMock.mockResolvedValueOnce({
      data: {
        status: 'closed',
        obligation: {
          id: 'obligation-001',
          companyId: 'company-001',
          name: 'Guia DAS - Simples Nacional - 2026-07',
          dueDate: '2026-08-20T00:00:00.000Z',
          amount: '1200.00',
          status: 'PENDING',
          fileUrl: null,
          createdAt: '2026-09-06T18:00:00.000Z',
          version: 1,
        },
        auditTrail: {
          closureProtocol: 'BCOST-TAX-2026-07-ABCDEF123456',
          evidencePacketId: 'tax-preview:company-001:2026-07',
          integrityHash:
            '4c94515af2d81bf7866b5ddc03c0f4ed7a7130b44b604d082a924a3a40f51a86',
          period: '2026-07',
          generatedAt: '2026-09-06T18:00:00.000Z',
        },
        officialEvidence: {
          pendingArtifacts: ['RECIBO_PGDAS_D', 'GUIA_DAS'],
          message: 'Anexe recibo oficial.',
        },
        snapshotId: 'snapshot-001',
        integrityHash:
          'da5b452e7d2d273eb37e67e8e9faf6d7b1019bfc8ed003d85eeec7d8b51fd3e8',
      },
    });

    const response = await coreTaxPreviewApi.closeMonth('company-001', {
      month: 7,
      year: 2026,
      hasCrcReview: true,
    });

    expect(response.obligation.name).toBe('Guia DAS - Simples Nacional - 2026-07');
    expect(response.auditTrail.closureProtocol).toBe(
      'BCOST-TAX-2026-07-ABCDEF123456',
    );
    expect(response.officialEvidence.pendingArtifacts).toEqual([
      'RECIBO_PGDAS_D',
      'GUIA_DAS',
    ]);
    expect(apiPostMock).toHaveBeenCalledWith('/fiscal/tax/close-month/company-001', {
      month: 7,
      year: 2026,
      hasCrcReview: true,
    });
  });

  it('keeps the UI usable when the EC2 backend still returns the legacy close payload', async () => {
    apiPostMock.mockResolvedValueOnce({
      data: {
        status: 'closed',
        obligation: { id: 'obligation-legacy', name: 'Guia DAS legada' },
        snapshotId: 'snapshot-legacy-1234567890',
        integrityHash:
          '049a5d4675debc7fdaafc9054bd4690558bd9a9807f92ad765be19be8bc71f9d',
      },
    });

    const response = await coreTaxPreviewApi.closeMonth('company-001', {
      month: 7,
      year: 2026,
    });

    expect(response.status).toBe('closed');
    expect(response.obligation.id).toBe('obligation-legacy');
    expect(response.auditTrail.closureProtocol).toBe(
      'BCOST-TAX-LEGACY-snapshot-leg',
    );
    expect(response.auditTrail.integrityHash).toBe(
      '049a5d4675debc7fdaafc9054bd4690558bd9a9807f92ad765be19be8bc71f9d',
    );
    expect(response.officialEvidence.message).toContain('Confirme recibo PGDAS-D');
  });
});
