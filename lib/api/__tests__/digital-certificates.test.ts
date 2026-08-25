import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { digitalCertificatesApi } from '../digital-certificates';

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

describe('digitalCertificatesApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('serves list, summary, detail and audit locally for demo companies', async () => {
    const list = await digitalCertificatesApi.list('demo-001');
    const summary = await digitalCertificatesApi.summary('demo-001');
    const detail = await digitalCertificatesApi.detail('demo-001', list.items[0]?.id || '');
    const audit = await digitalCertificatesApi.audit('demo-001');

    expect(list.items.length).toBeGreaterThan(0);
    expect(list.summary.count).toBeGreaterThan(0);
    expect(summary.summary.count).toBe(list.summary.count);
    expect(detail.item.id).toBe(list.items[0]?.id);
    expect(audit.items).toEqual([]);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps certificate writes, revocation and removal local in demo mode', async () => {
    const created = await digitalCertificatesApi.create('demo-001', {
      issuer: 'AC Demo Teste',
      thumbprint: 'ABC123',
      serialNumber: 'SER-123',
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-12-31T23:59:59.000Z',
      status: 'ACTIVE',
    });
    const updated = await digitalCertificatesApi.update('demo-001', created.item?.id || '', {
      issuer: 'AC Demo Teste Atualizada',
    });
    const revoked = await digitalCertificatesApi.revoke('demo-001', created.item?.id || '');
    const removed = await digitalCertificatesApi.remove('demo-001', created.item?.id || '');
    const audit = await digitalCertificatesApi.audit('demo-001');

    expect(created.item?.issuer).toBe('AC Demo Teste');
    expect(updated.item?.issuer).toBe('AC Demo Teste Atualizada');
    expect(revoked.item?.status).toBe('REVOKED');
    expect(removed.deletedId).toBe(created.item?.id);
    expect(audit.items.length).toBeGreaterThanOrEqual(4);
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPatchMock).not.toHaveBeenCalled();
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        module: 'digital-certificates',
        model: 'DigitalCertificate',
        companyId: 'real-company',
        items: [],
        total: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
        summary: {
          count: 0,
          active: 0,
          expired: 0,
          revoked: 0,
          expiringSoon: 0,
          valid: 0,
          nextExpiration: null,
          status: {},
        },
        generatedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    const response = await digitalCertificatesApi.list('real-company');

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith('/digital-certificates/enterprise/real-company');
  });

  it('does not use local demo store for real companies', async () => {
    apiPostMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        message: 'Certificado criado',
        companyId: 'real-company',
        item: {
          id: 'real-cert-001',
          companyId: 'real-company',
          issuer: 'AC Produção',
          validFrom: '2026-01-01T00:00:00.000Z',
          validTo: '2026-12-31T23:59:59.000Z',
          status: 'ACTIVE',
        },
        audit: { recorded: true },
        generatedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    const response = await digitalCertificatesApi.create('real-company', {
      issuer: 'AC Produção',
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-12-31T23:59:59.000Z',
      status: 'ACTIVE',
    });

    expect(response.companyId).toBe('real-company');
    expect(apiPostMock).toHaveBeenCalledWith('/digital-certificates/enterprise/real-company', {
      issuer: 'AC Produção',
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-12-31T23:59:59.000Z',
      status: 'ACTIVE',
    });
  });
});
