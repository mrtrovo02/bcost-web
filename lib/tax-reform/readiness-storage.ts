import {
  mergeTaxReformReadinessItems,
  TaxReformReadinessItem,
  TaxReformReadinessPatch,
  toTaxReformReadinessPatches,
} from './readiness-engine';
import {
  safeJsonParse,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
} from '@/lib/utils/runtime-guards';

const STORAGE_VERSION = 1;

interface StoredReadiness {
  version: number;
  companyId: string;
  updatedAt: string;
  patches: TaxReformReadinessPatch[];
}

export interface TaxReformReadinessAuditRecord {
  id: string;
  companyId: string;
  action: 'status-change' | 'reset';
  itemId?: string;
  itemTitle?: string;
  previousStatus?: string;
  nextStatus?: string;
  createdAt: string;
}

function storageKey(companyId: string) {
  return `bcost_tax_reform_readiness:${companyId}`;
}

function auditStorageKey(companyId: string) {
  return `bcost_tax_reform_readiness_audit:${companyId}`;
}

function isValidPatch(value: unknown): value is TaxReformReadinessPatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const patch = value as Partial<TaxReformReadinessPatch>;
  return typeof patch.id === 'string' && patch.id.length > 0;
}

export function loadTaxReformReadiness(companyId: string): TaxReformReadinessItem[] {
  if (!companyId) return mergeTaxReformReadinessItems();

  const stored = safeJsonParse<Partial<StoredReadiness> | null>(
    safeLocalStorageGet(storageKey(companyId)),
    null,
  );

  if (!stored || stored.version !== STORAGE_VERSION || stored.companyId !== companyId) {
    return mergeTaxReformReadinessItems();
  }

  const patches = Array.isArray(stored.patches) ? stored.patches.filter(isValidPatch) : [];
  return mergeTaxReformReadinessItems(patches);
}

export function saveTaxReformReadiness(companyId: string, items: TaxReformReadinessItem[]) {
  if (!companyId) return;

  const payload: StoredReadiness = {
    version: STORAGE_VERSION,
    companyId,
    updatedAt: new Date().toISOString(),
    patches: toTaxReformReadinessPatches(items),
  };

  safeLocalStorageSet(storageKey(companyId), JSON.stringify(payload));
}

export function resetTaxReformReadiness(companyId: string): TaxReformReadinessItem[] {
  if (companyId) {
    safeLocalStorageRemove(storageKey(companyId));
  }

  return mergeTaxReformReadinessItems();
}

export function loadTaxReformReadinessAudit(companyId: string): TaxReformReadinessAuditRecord[] {
  if (!companyId) return [];

  return safeJsonParse<TaxReformReadinessAuditRecord[]>(
    safeLocalStorageGet(auditStorageKey(companyId)),
    [],
  ).filter((record) => record.companyId === companyId);
}

export function appendTaxReformReadinessAudit(
  record: Omit<TaxReformReadinessAuditRecord, 'id' | 'createdAt'>,
): TaxReformReadinessAuditRecord[] {
  if (!record.companyId) return [];

  const nextRecord: TaxReformReadinessAuditRecord = {
    ...record,
    id: `${record.companyId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const current = loadTaxReformReadinessAudit(record.companyId);
  const next = [nextRecord, ...current].slice(0, 50);

  safeLocalStorageSet(auditStorageKey(record.companyId), JSON.stringify(next));

  return next;
}
