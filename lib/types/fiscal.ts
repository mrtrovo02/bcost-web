/**
 * bCost Engine API 1.0 - Enterprise Edition
 * bcost-web > types > fiscal.ts
 * Definições globais de tipos para o Motor de Inteligência Fiscal
 */

/**
 * Tipos de Documentos Suportados pela Engine
 */
export enum XmlDocumentType {
  NFE = 'NFE',
  NFSE = 'NFSE',
  CTE = 'CTE',
}

/**
 * KPIs Estratégicos e Saúde Fiscal (DashboardPrincipal)
 */
export interface FiscalDashboardStats {
  revenue: number; // Faturamento Total no período
  taxPaid: number; // Impostos pagos (Anexo IV/V padrão)
  taxSaved: number; // Economia gerada via Fator R (Anexo III)
  healthScore: number; // 0-100 calculado pela Engine
  rbt12: number; // Receita Bruta Total acumulada (12 meses)
  usagePercent: string; // % de utilização do limite do Simples Nacional
  warning: string; // Mensagem de alerta da Engine bCost
  lastUpdate: string; // Timestamp da última sincronização
}

/**
 * Série Temporal de Performance para Gráficos (Recharts)
 */
export interface MonthlyPerformance {
  month: string;
  year?: number;
  revenue?: number;
  expenses?: number;
  profit?: number;
  billed?: number;
  tax?: number;
  optimized?: number;
  total?: number;
  amount?: number;
  imposto?: number;
  faturamento?: number;
}

/**
 * Diagnóstico de Inteligência: Fator R e Folha de Pagamento
 */
export interface PayrollDiagnostic {
  currentFactor: number; // R = Folha / Faturamento (ex: 0.28)
  requiredPayroll: number; // Valor de folha necessário para Anexo III
  actualPayroll: number; // Valor de folha atual
  status: 'SAFE' | 'CRITICAL' | 'OPTIMIZING';
  projection: {
    nextMonth: string;
    estimatedSaving: number;
  };
}

/**
 * Documento Fiscal Individual (Auditado)
 */
export interface Invoice {
  id: string;
  accessKey: string;
  number: string;
  issuer: string;
  recipient: string;
  value: number;
  date: string;
  type: XmlDocumentType;
  status: 'VALID' | 'INVALID' | 'PENDING';
  finNFe?: string;
  issuePurpose?:
    | 'NORMAL'
    | 'COMPLEMENTARY'
    | 'ADJUSTMENT'
    | 'RETURN'
    | 'DEBIT_NOTE'
    | 'CREDIT_NOTE';
  cstCode?: string;
  cClassTribCode?: string;
  destinationStateIbge?: string;
  destinationMunicipalityIbge?: string;
  hasLegacyTaxes?: boolean;
  taxReformPayload?: TaxReformPayload;
}

export interface TaxReformPayload {
  group: 'UB';
  cbsValue: number;
  ibsValue: number;
  selectiveTaxValue: number;
  raw?: unknown;
}

export type TaxReformTaxType = 'CBS' | 'IBS' | 'IS';
export type NFeIssuePurpose =
  | 'NORMAL'
  | 'COMPLEMENTARY'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'DEBIT_NOTE'
  | 'CREDIT_NOTE';

export interface TaxReformDestination {
  stateIbgeCode: string;
  municipalityIbgeCode?: string;
}

export interface TaxReformItemInput {
  itemId: string;
  description?: string;
  baseAmount: number;
  cstCode?: string;
  cClassTribCode?: string;
  ncm?: string;
  isNationalBasicBasket?: boolean;
  reductionRate?: number;
  legacyTaxAmount?: number;
  selectiveTaxCstCode?: string;
  selectiveTaxClassCode?: string;
  selectiveTaxBaseAmount?: number;
  selectiveTaxUnit?: string;
  selectiveTaxQuantity?: number;
  selectiveTaxAdRemRate?: number;
}

export interface TaxCreditInput {
  taxType: TaxReformTaxType;
  amount: number;
  documentKey?: string;
}

export interface TaxReformSimulationInput {
  issuePurpose?: NFeIssuePurpose;
  destination?: TaxReformDestination;
  items: TaxReformItemInput[];
  credits?: TaxCreditInput[];
  rates?: Partial<Record<TaxReformTaxType, number>>;
}

export interface TaxReformResolvedSimulationInput extends TaxReformSimulationInput {
  companyId?: string;
  operationDate?: string;
}

export interface TaxReformItemCalculation {
  itemId: string;
  baseAmount: number;
  taxableBaseAmount: number;
  cstCode?: string;
  cClassTribCode?: string;
  cbsValue: number;
  ibsValue: number;
  ibsStateValue: number;
  ibsMunicipalValue: number;
  selectiveTaxValue: number;
  total: number;
  applied: {
    cbsRate: number;
    ibsRate: number;
    ibsStateRate: number;
    ibsMunicipalRate: number;
    selectiveTaxRate: number;
    selectiveTaxAdRemRate: number;
    selectiveTaxQuantity: number;
    reductionRate: number;
    zeroRate: boolean;
  };
}

export interface TaxCalculationResult {
  regime: 'LEGACY' | 'REFORM_2026';
  sourceVersion: string;
  xmlSchema: string;
  xmlGroup: 'UB' | 'LEGACY';
  issuePurpose: NFeIssuePurpose;
  destination?: TaxReformDestination;
  totals: {
    baseAmount: number;
    taxableBaseAmount: number;
    cbsValue: number;
    ibsValue: number;
    selectiveTaxValue: number;
    grossTax: number;
    creditsApplied: number;
    netTax: number;
  };
  items: TaxReformItemCalculation[];
  credits: TaxCreditInput[];
  validations: string[];
}

export interface TaxReformXmlBuildResult {
  schema: 'DFeTiposBasicos_v1.00.xsd';
  group: 'UB';
  xml: string;
  calculation: TaxCalculationResult;
  validations: string[];
}

export interface TaxReformResolvedParameters {
  sourceVersion: string;
  operationDate: string;
  classification?: {
    cstCode: string;
    cClassTribCode: string;
    description: string;
    taxType: TaxReformTaxType;
    isZeroRate: boolean;
    reductionRate: number;
    creditAllowed: boolean;
    legalBasis?: string | null;
  };
  destinationRule?: {
    destinationStateIbge: string;
    destinationMunicipalityIbge?: string | null;
    appliesIbs: boolean;
    appliesCbs: boolean;
    appliesSelectiveTax: boolean;
    priority: number;
  };
  rates: Record<TaxReformTaxType, number>;
  fallbackApplied: boolean;
}

export interface CbsIbsSimulationResult {
  revenue: number;
  cbsValue: number;
  ibsValue: number;
  totalTransitionalTax: number;
  netRevenue: number;
  splitPaymentEstimate: {
    retentionAtSource: number;
    effectiveNetCashflow: number;
  };
}

/**
 * Resposta de Processamento de Lotes XML
 */
export interface BatchUploadResponse {
  totalProcessed: number;
  success: number;
  errors: Array<{
    fileName: string;
    reason: string;
  }>;
  batchId: string;
}

/**
 * Interface de Integração Global da Store (Zustand)
 */
export interface FiscalIntelligence {
  health: FiscalDashboardStats;
  optimization: MonthlyPerformance[];
  performance: PayrollDiagnostic;
  integrity: {
    status: 'VALID' | 'WARNING' | 'AUDIT_REQUIRED';
    lastAudit: string;
  };
}
