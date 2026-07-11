import { describe, expect, it } from 'vitest';
import { calculateTaxReformScenarios } from '../scenario-engine';

describe('calculateTaxReformScenarios', () => {
  it('builds the fiscal stack from current tax to restructured scenario', () => {
    const result = calculateTaxReformScenarios({
      annualRevenue: 1800000,
      currentTax: 198000,
    });

    expect(result.scenarios).toHaveLength(4);
    expect(result.scenarios[0].title).toBe('Simples atual');
    expect(result.scenarios[1].taxAmount).toBe(18000);
    expect(result.scenarios[2].taxAmount).toBe(333000);
    expect(result.scenarios[3].taxAmount).toBe(293040);
    expect(result.referenceGap).toBe(135000);
    expect(result.restructuredSaving).toBe(39960);
  });

  it('never emits negative taxes for empty revenue', () => {
    const result = calculateTaxReformScenarios({
      annualRevenue: 0,
      currentTax: 1000,
    });

    expect(result.scenarios.every((scenario) => scenario.taxAmount >= 0)).toBe(true);
    expect(
      result.scenarios.every(
        (scenario) => Number.isFinite(scenario.effectiveRate) && scenario.effectiveRate >= 0,
      ),
    ).toBe(true);
  });
});
