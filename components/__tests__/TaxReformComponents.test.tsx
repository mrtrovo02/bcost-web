import { describe, expect, it } from 'vitest';
import { calcularCbsIbs } from '../alerts/CbsIbsAlertBanner';
import { calcularSplitPayment } from '../split-payment/SplitPaymentProjector';

describe('tax reform calculations', () => {
  it('calculates CBS and IBS transition test values', () => {
    expect(calcularCbsIbs(100000)).toEqual({
      baseValue: 100000,
      cbs: 900,
      ibs: 100,
      total: 1000,
    });
  });

  it('projects split payment retention using managerial assumptions', () => {
    const projection = calcularSplitPayment(
      {
        aliquotaEfetiva: 0.1,
        faturamentoMensal: 100000,
        meiosPagamento: { pix: 50, cartao: 30, boleto: 10, outros: 10 },
      },
      2027,
    );

    expect(projection).toHaveLength(12);
    expect(projection[0].impostoSplit).toBe(2100);
    expect(projection[0].valorRecebido).toBe(97900);
  });
});
