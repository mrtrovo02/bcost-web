import { describe, expect, it } from 'vitest';
import { CBS_IBS_TRANSITION, TAX_REFORM_OFFICIAL_SOURCES } from '../official-data';

describe('CBS_IBS_TRANSITION official data', () => {
  it('keeps 2026 test rates aligned with official guidance', () => {
    expect(CBS_IBS_TRANSITION.cbsRate).toBe(0.009);
    expect(CBS_IBS_TRANSITION.ibsRate).toBe(0.001);
    expect(CBS_IBS_TRANSITION.totalTestRate).toBe(0.01);
    expect(CBS_IBS_TRANSITION.displayStartDate).toBe('01/01/2026');
    expect(CBS_IBS_TRANSITION.isCollectionDispensedIn2026).toBe(true);
  });

  it('does not communicate unconditional risk-free collection dispensation', () => {
    expect(CBS_IBS_TRANSITION.operationalNote).toContain('cumprir as obrigações acessórias');
    expect(CBS_IBS_TRANSITION.operationalNote).toContain('desconformidade fiscal');
    expect(CBS_IBS_TRANSITION.operationalNote).not.toContain('sem risco de autuação');
  });

  it('maps electronic documents that require CBS and IBS readiness in 2026', () => {
    expect(CBS_IBS_TRANSITION.requiredElectronicDocuments2026).toEqual(
      expect.arrayContaining(['NF-e', 'NFC-e', 'CT-e', 'NFS-e', 'NFCom', 'NF3e']),
    );
    expect(CBS_IBS_TRANSITION.complianceRiskNote).toContain('31/12/2026');
    expect(CBS_IBS_TRANSITION.complianceRiskNote).toContain('desconformidade');
  });

  it('keeps official source URLs centralized', () => {
    expect(TAX_REFORM_OFFICIAL_SOURCES.constitutionalAmendment132).toContain('planalto.gov.br');
    expect(TAX_REFORM_OFFICIAL_SOURCES.revenueGuidance2026).toContain('gov.br/receitafederal');
    expect(TAX_REFORM_OFFICIAL_SOURCES.nfseGuidance2026).toContain('gov.br/nfse');
  });
});
