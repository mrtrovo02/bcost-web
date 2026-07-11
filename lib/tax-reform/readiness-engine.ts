import { CBS_IBS_TRANSITION } from './official-data';

export type ReadinessStatus = 'done' | 'in-progress' | 'blocked' | 'not-started';
export type ReadinessPriority = 'critical' | 'high' | 'medium';

export interface TaxReformReadinessItem {
  id: string;
  title: string;
  description: string;
  owner: 'Fiscal' | 'Tecnologia' | 'Contabilidade' | 'Financeiro';
  priority: ReadinessPriority;
  status: ReadinessStatus;
  dueDate: string;
  evidence: string;
}

export interface TaxReformReadinessResult {
  score: number;
  completed: number;
  total: number;
  criticalOpen: number;
  phase: 'red' | 'amber' | 'green';
  headline: string;
  nextAction: TaxReformReadinessItem;
  items: TaxReformReadinessItem[];
}

export type TaxReformReadinessPatch = Pick<TaxReformReadinessItem, 'id'> &
  Partial<Pick<TaxReformReadinessItem, 'status' | 'evidence'>>;

const STATUS_WEIGHT: Record<ReadinessStatus, number> = {
  done: 1,
  'in-progress': 0.55,
  blocked: 0.2,
  'not-started': 0,
};

const PRIORITY_WEIGHT: Record<ReadinessPriority, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

export const DEFAULT_TAX_REFORM_READINESS_ITEMS: TaxReformReadinessItem[] = [
  {
    id: 'nfe-schema',
    title: 'Validar schema NF-e com campos CBS/IBS',
    description:
      'Confirmar que o fluxo de emissão, importação e leitura de XML reconhece os destaques CBS e IBS da fase de teste.',
    owner: 'Tecnologia',
    priority: 'critical',
    status: 'in-progress',
    dueDate: CBS_IBS_TRANSITION.displayStartDate,
    evidence: 'XML homologado com tags da Reforma Tributária',
  },
  {
    id: 'tax-calculation',
    title: 'Conciliar cálculo 0,9% CBS + 0,1% IBS',
    description:
      'Comparar o motor bCost com amostra de notas reais para garantir destaque operacional sem afetar recolhimento definitivo em 2026.',
    owner: 'Fiscal',
    priority: 'critical',
    status: 'in-progress',
    dueDate: CBS_IBS_TRANSITION.displayStartDate,
    evidence: 'Planilha de conciliação por documento fiscal',
  },
  {
    id: 'accountant-approval',
    title: 'Aprovar premissas com contador responsável',
    description:
      'Registrar aceite técnico sobre alíquotas de teste, CNAE, regime tributário, créditos e interpretação operacional.',
    owner: 'Contabilidade',
    priority: 'high',
    status: 'not-started',
    dueDate: '15/08/2026',
    evidence: 'Parecer ou checklist assinado pelo responsável contábil',
  },
  {
    id: 'split-payment-cash',
    title: 'Simular impacto de Split Payment no caixa',
    description:
      'Projetar recebíveis por PIX, cartão e boleto para medir capital de giro necessário nos cenários da transição.',
    owner: 'Financeiro',
    priority: 'high',
    status: 'in-progress',
    dueDate: '31/08/2026',
    evidence: 'Relatório de sensibilidade por meio de pagamento',
  },
  {
    id: 'audit-trail',
    title: 'Registrar trilha de auditoria da adaptação',
    description:
      'Manter histórico de alterações, fontes oficiais usadas, responsáveis e evidências para suporte LGPD e governança fiscal.',
    owner: 'Fiscal',
    priority: 'medium',
    status: 'not-started',
    dueDate: '30/09/2026',
    evidence: 'Log de auditoria por empresa e usuário',
  },
  {
    id: 'executive-report',
    title: 'Gerar relatório executivo mensal',
    description:
      'Enviar visão de prontidão, gap fiscal e próximos passos para gestor e contador em ciclo recorrente.',
    owner: 'Financeiro',
    priority: 'medium',
    status: 'not-started',
    dueDate: '30/09/2026',
    evidence: 'PDF mensal anexado ao dossiê fiscal',
  },
];

export function mergeTaxReformReadinessItems(
  patches: TaxReformReadinessPatch[] = [],
  baseItems: TaxReformReadinessItem[] = DEFAULT_TAX_REFORM_READINESS_ITEMS,
): TaxReformReadinessItem[] {
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));

  return baseItems.map((item) => {
    const patch = patchById.get(item.id);
    if (!patch) return item;

    return {
      ...item,
      status: patch.status ?? item.status,
      evidence: patch.evidence ?? item.evidence,
    };
  });
}

export function toTaxReformReadinessPatches(
  items: TaxReformReadinessItem[],
  baseItems: TaxReformReadinessItem[] = DEFAULT_TAX_REFORM_READINESS_ITEMS,
): TaxReformReadinessPatch[] {
  const baseById = new Map(baseItems.map((item) => [item.id, item]));

  return items
    .map((item) => {
      const base = baseById.get(item.id);
      if (!base) return null;

      const patch: TaxReformReadinessPatch = { id: item.id };
      if (item.status !== base.status) patch.status = item.status;
      if (item.evidence !== base.evidence) patch.evidence = item.evidence;

      return Object.keys(patch).length > 1 ? patch : null;
    })
    .filter((patch): patch is TaxReformReadinessPatch => Boolean(patch));
}

function scoreItems(items: TaxReformReadinessItem[]) {
  const max = items.reduce((sum, item) => sum + PRIORITY_WEIGHT[item.priority], 0);
  const earned = items.reduce(
    (sum, item) => sum + PRIORITY_WEIGHT[item.priority] * STATUS_WEIGHT[item.status],
    0,
  );

  return max > 0 ? Math.round((earned / max) * 100) : 0;
}

export function calculateTaxReformReadiness(
  items: TaxReformReadinessItem[] = DEFAULT_TAX_REFORM_READINESS_ITEMS,
): TaxReformReadinessResult {
  const score = scoreItems(items);
  const completed = items.filter((item) => item.status === 'done').length;
  const criticalOpen = items.filter(
    (item) => item.priority === 'critical' && item.status !== 'done',
  ).length;
  const phase = score >= 85 && criticalOpen === 0 ? 'green' : score >= 60 ? 'amber' : 'red';
  const nextAction =
    items.find((item) => item.priority === 'critical' && item.status !== 'done') ||
    items.find((item) => item.status !== 'done') ||
    items[0];

  return {
    score,
    completed,
    total: items.length,
    criticalOpen,
    phase,
    headline:
      phase === 'green'
        ? 'Empresa preparada para a fase de teste CBS/IBS.'
        : phase === 'amber'
          ? 'Prontidão parcial: falta fechar controles críticos.'
          : 'Risco alto: adaptação CBS/IBS precisa entrar em prioridade executiva.',
    nextAction,
    items,
  };
}
