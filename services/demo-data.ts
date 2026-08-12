/**
 * bCost Demo Data Engine
 * Dados mock para desenvolvimento local sem API real.
 */

import { writeCookie } from './api';
import { TransactionStatus } from '@/lib/types/global';
import { XmlDocumentType } from '@/lib/types/fiscal';

const DEMO_TOKEN = 'demo-token-local';

export interface DemoCompany {
  id: string;
  name: string;
  cnpj: string;
  role: string;
  status: string;
  plan: string;
}

export interface DemoFiscalData {
  company: string;
  comparison: {
    comBcost: number;
    semBcost: number;
    netSavings: number;
  };
  metadata: {
    anexoUtilizado: string;
  };
  evolucao: Array<{
    month: string;
    year: number;
    faturamento: number;
    imposto: number;
    taxPercentage: number;
    otimizado: number;
    semBeneficio: number;
  }>;
}

export const DEMO_COMPANIES: DemoCompany[] = [
  {
    id: 'demo-001',
    name: 'Tech Solutions Ltda',
    cnpj: '12.345.678/0001-90',
    role: 'OWNER',
    status: 'ACTIVE',
    plan: 'ENTERPRISE',
  },
  {
    id: 'demo-002',
    name: 'Studio Criativo ME',
    cnpj: '98.765.432/0001-10',
    role: 'OWNER',
    status: 'ACTIVE',
    plan: 'PRO',
  },
  {
    id: 'demo-003',
    name: 'Consultoria ABC SS',
    cnpj: '55.123.456/0001-78',
    role: 'ACCOUNTANT',
    status: 'ACTIVE',
    plan: 'BASIC',
  },
];

export function getDemoFiscalData(companyName: string): DemoFiscalData {
  return {
    company: companyName,
    comparison: {
      comBcost: 45230.18,
      semBcost: 68791.42,
      netSavings: 23561.24,
    },
    metadata: {
      anexoUtilizado: 'III',
    },
    evolucao: [
      {
        month: 'JAN',
        year: 2026,
        faturamento: 120000,
        imposto: 14400,
        taxPercentage: 12.0,
        otimizado: 13200,
        semBeneficio: 18000,
      },
      {
        month: 'FEV',
        year: 2026,
        faturamento: 135000,
        imposto: 14850,
        taxPercentage: 11.0,
        otimizado: 13500,
        semBeneficio: 20250,
      },
      {
        month: 'MAR',
        year: 2026,
        faturamento: 110000,
        imposto: 12100,
        taxPercentage: 11.0,
        otimizado: 11000,
        semBeneficio: 16500,
      },
      {
        month: 'ABR',
        year: 2026,
        faturamento: 145000,
        imposto: 15950,
        taxPercentage: 11.0,
        otimizado: 14500,
        semBeneficio: 21750,
      },
      {
        month: 'MAI',
        year: 2026,
        faturamento: 158000,
        imposto: 17380,
        taxPercentage: 11.0,
        otimizado: 15800,
        semBeneficio: 23700,
      },
      {
        month: 'JUN',
        year: 2026,
        faturamento: 162000,
        imposto: 16200,
        taxPercentage: 10.0,
        otimizado: 14580,
        semBeneficio: 24300,
      },
    ],
  };
}

export function getDemoPayroll() {
  return [
    {
      id: 'emp-1',
      employeeName: 'Carlos Silva',
      department: 'TECNOLOGIA',
      grossSalary: 12500,
      netSalary: 9800,
      taxTotal: 2700,
      referenceMonth: '06/2026',
    },
    {
      id: 'emp-2',
      employeeName: 'Ana Oliveira',
      department: 'ADMINISTRATIVO',
      grossSalary: 8500,
      netSalary: 6700,
      taxTotal: 1800,
      referenceMonth: '06/2026',
    },
    {
      id: 'emp-3',
      employeeName: 'Roberto Lima',
      department: 'COMERCIAL',
      grossSalary: 15000,
      netSalary: 11200,
      taxTotal: 3800,
      referenceMonth: '06/2026',
    },
    {
      id: 'emp-4',
      employeeName: 'Juliana Costa',
      department: 'TECNOLOGIA',
      grossSalary: 18000,
      netSalary: 13500,
      taxTotal: 4500,
      referenceMonth: '06/2026',
    },
    {
      id: 'emp-5',
      employeeName: 'Fernando Santos',
      department: 'ADMINISTRATIVO',
      grossSalary: 6200,
      netSalary: 5100,
      taxTotal: 1100,
      referenceMonth: '06/2026',
    },
  ];
}

export function getDemoInvoices() {
  return [
    {
      id: 'nf-1',
      accessKey: '35200612345678901234567890123456789012345678',
      number: '000123',
      issuer: 'Tech Solutions Ltda',
      recipient: 'Cliente A S.A.',
      value: 45000,
      date: '2026-06-15',
      type: XmlDocumentType.NFE,
      status: 'VALID' as const,
      finNFe: '1',
      issuePurpose: 'NORMAL' as const,
      cstCode: '000',
      cClassTribCode: '000001',
      destinationStateIbge: '35',
      destinationMunicipalityIbge: '3550308',
      hasLegacyTaxes: true,
      taxReformPayload: {
        group: 'UB' as const,
        cbsValue: 405,
        ibsValue: 45,
        selectiveTaxValue: 0,
      },
    },
    {
      id: 'nf-2',
      accessKey: '35200612345678901234567890123456789012345679',
      number: '000124',
      issuer: 'Studio Criativo ME',
      recipient: 'Cliente B Ltda',
      value: 12800,
      date: '2026-06-14',
      type: XmlDocumentType.NFSE,
      status: 'VALID' as const,
    },
    {
      id: 'nf-3',
      accessKey: '35200612345678901234567890123456789012345680',
      number: '000125',
      issuer: 'Consultoria ABC SS',
      recipient: 'Cliente C ME',
      value: 8700,
      date: '2026-06-13',
      type: XmlDocumentType.NFE,
      status: 'PENDING' as const,
      finNFe: '6',
      issuePurpose: 'CREDIT_NOTE' as const,
      cstCode: '000',
      cClassTribCode: '000001',
      destinationStateIbge: '35',
      destinationMunicipalityIbge: '3550308',
      hasLegacyTaxes: false,
      taxReformPayload: {
        group: 'UB' as const,
        cbsValue: 78.3,
        ibsValue: 8.7,
        selectiveTaxValue: 0,
      },
    },
    {
      id: 'nf-4',
      accessKey: '35200612345678901234567890123456789012345681',
      number: '000126',
      issuer: 'Tech Solutions Ltda',
      recipient: 'Cliente D SS',
      value: 32000,
      date: '2026-06-10',
      type: XmlDocumentType.NFE,
      status: 'VALID' as const,
    },
  ];
}

export function getDemoBankTransactions() {
  return [
    {
      id: 'tx-1',
      date: '2026-06-17',
      description: 'Pagamento Cliente A',
      amount: 45000,
      type: 'CREDIT' as const,
      status: TransactionStatus.RECONCILED,
    },
    {
      id: 'tx-2',
      date: '2026-06-16',
      description: 'Fornecedor X',
      amount: 12300,
      type: 'DEBIT' as const,
      status: TransactionStatus.RECONCILED,
    },
    {
      id: 'tx-3',
      date: '2026-06-15',
      description: 'Pagamento Cliente B',
      amount: 12800,
      type: 'CREDIT' as const,
      status: TransactionStatus.PENDING,
    },
    {
      id: 'tx-4',
      date: '2026-06-14',
      description: 'Aluguel',
      amount: 5000,
      type: 'DEBIT' as const,
      status: TransactionStatus.RECONCILED,
    },
    {
      id: 'tx-5',
      date: '2026-06-13',
      description: 'Recebimento Serviço',
      amount: 8700,
      type: 'CREDIT' as const,
      status: TransactionStatus.RECONCILED,
    },
  ];
}

export function seedDemoData(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO !== 'true' && process.env.NODE_ENV === 'production') {
    return false;
  }

  const alreadySeeded = sessionStorage.getItem('bcost_demo_seeded');
  if (alreadySeeded) return true;

  localStorage.setItem('bcost_active_company', DEMO_COMPANIES[0].id);
  localStorage.setItem('bcost_active_company_data', JSON.stringify(DEMO_COMPANIES[0]));
  localStorage.setItem('bcost_companies', JSON.stringify(DEMO_COMPANIES));
  localStorage.setItem('companies', JSON.stringify(DEMO_COMPANIES));
  localStorage.setItem('bcost_company_id', DEMO_COMPANIES[0].id);
  localStorage.setItem('bcost_token', DEMO_TOKEN);
  localStorage.setItem(
    'bcost_user',
    JSON.stringify({
      id: 'demo-user-1',
      email: 'demo@bcost.com.br',
      name: 'Usuário Demo',
    }),
  );

  writeCookie('bcost_token', DEMO_TOKEN);
  writeCookie('bcost_access_token', DEMO_TOKEN);
  writeCookie('bcost_company_id', DEMO_COMPANIES[0].id);

  sessionStorage.setItem('bcost_demo_seeded', 'true');

  console.log('📦 [bCost Demo]: Dados de demonstração semeados com sucesso!');
  return true;
}
