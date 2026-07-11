import { describe, expect, it } from 'vitest';
import {
  calculateTaxReformReadiness,
  mergeTaxReformReadinessItems,
  TaxReformReadinessItem,
  toTaxReformReadinessPatches,
} from '../readiness-engine';

const baseItem: TaxReformReadinessItem = {
  id: 'base',
  title: 'Base',
  description: 'Base',
  owner: 'Fiscal',
  priority: 'critical',
  status: 'done',
  dueDate: '01/08/2026',
  evidence: 'Evidence',
};

describe('calculateTaxReformReadiness', () => {
  it('weights critical unfinished work more heavily', () => {
    const result = calculateTaxReformReadiness([
      { ...baseItem, id: 'critical', priority: 'critical', status: 'not-started' },
      { ...baseItem, id: 'high', priority: 'high', status: 'done' },
      { ...baseItem, id: 'medium', priority: 'medium', status: 'done' },
    ]);

    expect(result.score).toBe(50);
    expect(result.criticalOpen).toBe(1);
    expect(result.phase).toBe('red');
    expect(result.nextAction.id).toBe('critical');
  });

  it('marks readiness green only when critical items are done', () => {
    const result = calculateTaxReformReadiness([
      { ...baseItem, id: 'critical-a', priority: 'critical', status: 'done' },
      { ...baseItem, id: 'critical-b', priority: 'critical', status: 'done' },
      { ...baseItem, id: 'medium', priority: 'medium', status: 'in-progress' },
    ]);

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.criticalOpen).toBe(0);
    expect(result.phase).toBe('green');
  });

  it('serializes only changed readiness fields and merges them back', () => {
    const base = [
      { ...baseItem, id: 'nfe-schema', status: 'in-progress' as const },
      { ...baseItem, id: 'tax-calculation', status: 'not-started' as const },
    ];
    const changed = [
      { ...base[0], status: 'done' as const },
      { ...base[1], status: 'not-started' as const },
    ];

    const patches = toTaxReformReadinessPatches(changed, base);
    const merged = mergeTaxReformReadinessItems(patches, base);

    expect(patches).toEqual([{ id: 'nfe-schema', status: 'done' }]);
    expect(merged[0].status).toBe('done');
    expect(merged[1].status).toBe('not-started');
  });
});
