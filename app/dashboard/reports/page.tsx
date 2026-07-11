'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Layers3, Loader2, RefreshCw, Scale, TrendingUp } from 'lucide-react';
import { ContabilModuleFactory } from '@/shared/factories/contabil-factory.shared';
import type {
  BalancoPatrimonialResult,
  BalanceteResult,
  DemonstrativoFinanceiroResult,
  RazaoContabilResult,
} from '@/domain/contabil/contabil.contracts';
import { formatCurrency } from '@/lib/formatters';
import { isDemoSession } from '@/services/api';

// ---------------------------------------------------------------------------
// Tipos e helpers
// ---------------------------------------------------------------------------

type ReportTab = 'dre' | 'balanco' | 'balancete' | 'razao';

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const ANO_ATUAL = new Date().getFullYear();
const MES_ATUAL = new Date().getMonth() + 1;
const ANOS = Array.from({ length: 5 }, (_, i) => ANO_ATUAL - i);

function readCompanyId(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('bcost_active_company') ||
    localStorage.getItem('bcost_company_id') ||
    localStorage.getItem('companyId') ||
    ''
  );
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

function getDemoDRE(ano: number, mes?: number): DemonstrativoFinanceiroResult {
  const periodo = mes ? `${String(mes).padStart(2, '0')}/${ano}` : String(ano);
  const base = mes ? 150000 : 1800000;
  const impostos = base * 0.11;
  const custos = base * 0.15;
  const despesas = base * 0.2;
  const receitaLiquida = base - impostos;
  const lucroBruto = receitaLiquida - custos;
  const resultado = lucroBruto - despesas;
  return {
    periodo,
    linhas: [
      { codigo: '3', descricao: 'RECEITA BRUTA DE VENDAS E SERVIÇOS', valor: base },
      { codigo: '3.1', descricao: '(-) DEDUÇÕES E IMPOSTOS SOBRE RECEITA', valor: -impostos },
      { codigo: '3.2', descricao: '(=) RECEITA LÍQUIDA', valor: receitaLiquida },
      { codigo: '5', descricao: '(-) CUSTOS DOS SERVIÇOS / PRODUTOS', valor: -custos },
      { codigo: '5.1', descricao: '(=) LUCRO BRUTO', valor: lucroBruto },
      { codigo: '6', descricao: '(-) DESPESAS OPERACIONAIS', valor: -despesas },
      { codigo: '7', descricao: '(=) RESULTADO LÍQUIDO DO EXERCÍCIO', valor: resultado },
    ],
    total: resultado,
  };
}

function getDemoBalanco(ano: number): BalancoPatrimonialResult {
  return {
    periodo: String(ano),
    ativo: {
      circulante: [
        { descricao: 'Caixa e Equivalentes de Caixa', valor: 280000 },
        { descricao: 'Contas a Receber', valor: 145000 },
        { descricao: 'Estoques', valor: 38000 },
        { descricao: 'Outros Ativos Circulantes', valor: 22000 },
      ],
      naoCirculante: [
        { descricao: 'Imobilizado', valor: 320000 },
        { descricao: 'Intangível', valor: 85000 },
      ],
      totalAtivo: 890000,
    },
    passivo: {
      circulante: [
        { descricao: 'Fornecedores', valor: 65000 },
        { descricao: 'Obrigações Fiscais', valor: 48000 },
        { descricao: 'Obrigações Trabalhistas', valor: 32000 },
        { descricao: 'Outros Passivos Circulantes', valor: 15000 },
      ],
      naoCirculante: [{ descricao: 'Empréstimos e Financiamentos', valor: 120000 }],
      patrimonioLiquido: [
        { descricao: 'Capital Social', valor: 400000 },
        { descricao: 'Reservas de Lucros', valor: 150000 },
        { descricao: 'Lucros/Prejuízos Acumulados', valor: 60000 },
      ],
      totalPassivoEPL: 890000,
    },
  };
}

function getDemoBalancete(mes: number, ano: number): BalanceteResult {
  return {
    periodo: `${String(mes).padStart(2, '0')}/${ano}`,
    contas: [
      {
        codigo: '1.1.1',
        nome: 'Caixa',
        saldoAnterior: 0,
        debitos: 280000,
        creditos: 120000,
        saldoAtual: 160000,
      },
      {
        codigo: '1.1.3',
        nome: 'Contas a Receber',
        saldoAnterior: 0,
        debitos: 145000,
        creditos: 80000,
        saldoAtual: 65000,
      },
      {
        codigo: '2.1.1',
        nome: 'Fornecedores',
        saldoAnterior: 0,
        debitos: 40000,
        creditos: 65000,
        saldoAtual: -25000,
      },
      {
        codigo: '3.1',
        nome: 'Receitas de Serviços',
        saldoAnterior: 0,
        debitos: 0,
        creditos: 150000,
        saldoAtual: -150000,
      },
      {
        codigo: '6.1',
        nome: 'Despesas Administrativas',
        saldoAnterior: 0,
        debitos: 45000,
        creditos: 0,
        saldoAtual: 45000,
      },
    ],
    totalDebitos: 510000,
    totalCreditos: 415000,
  };
}

function getDemoRazao(): RazaoContabilResult {
  return {
    conta: '1.1.1',
    nomeConta: 'Caixa e Equivalentes',
    periodo: `01/${ANO_ATUAL} a 06/${ANO_ATUAL}`,
    lancamentos: [
      {
        data: `${ANO_ATUAL}-01-05`,
        historico: 'Recebimento NF-001',
        debito: 45000,
        credito: 0,
        saldo: 45000,
      },
      {
        data: `${ANO_ATUAL}-01-10`,
        historico: 'Pagamento Fornecedor',
        debito: 0,
        credito: 12000,
        saldo: 33000,
      },
      {
        data: `${ANO_ATUAL}-02-03`,
        historico: 'Recebimento NF-002',
        debito: 38000,
        credito: 0,
        saldo: 71000,
      },
      {
        data: `${ANO_ATUAL}-02-15`,
        historico: 'Despesa Operacional',
        debito: 0,
        credito: 8500,
        saldo: 62500,
      },
      {
        data: `${ANO_ATUAL}-03-08`,
        historico: 'Recebimento NF-003',
        debito: 62000,
        credito: 0,
        saldo: 124500,
      },
    ],
    saldoFinal: 124500,
  };
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
          : 'bg-white text-slate-500 border border-slate-100 hover:border-blue-200 hover:text-blue-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function KpiCard({
  label,
  value,
  color = 'text-slate-900',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">{label}</p>
      <p className={`text-xl font-black ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}

// DRE
function DREView({ data }: { data: DemonstrativoFinanceiroResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.linhas
          .filter((l) => ['3', '3.2', '5.1', '7'].includes(l.codigo))
          .map((l) => (
            <KpiCard
              key={l.codigo}
              label={l.descricao.replace(/[()=]/g, '').trim()}
              value={Math.abs(l.valor)}
              color={
                l.codigo === '7'
                  ? l.valor >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                  : 'text-slate-900'
              }
            />
          ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Código
              </th>
              <th className="p-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Descrição
              </th>
              <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Valor (R$)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.linhas.map((linha) => {
              const isTotal =
                linha.codigo === '7' || linha.codigo === '5.1' || linha.codigo === '3.2';
              return (
                <tr
                  key={linha.codigo}
                  className={isTotal ? 'bg-slate-50' : 'hover:bg-slate-50/50 transition-colors'}
                >
                  <td className="p-4 text-xs font-mono text-slate-400">{linha.codigo}</td>
                  <td
                    className={`p-4 text-sm ${isTotal ? 'font-black text-slate-900' : 'font-medium text-slate-700'}`}
                  >
                    {linha.descricao}
                  </td>
                  <td
                    className={`p-4 text-sm text-right font-black ${
                      linha.valor < 0
                        ? 'text-rose-600'
                        : linha.codigo === '7'
                          ? linha.valor >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                          : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(Math.abs(linha.valor))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-600">
              <td
                colSpan={2}
                className="p-4 text-sm font-black text-white uppercase tracking-wider"
              >
                RESULTADO LÍQUIDO DO EXERCÍCIO — {data.periodo}
              </td>
              <td className="p-4 text-right text-sm font-black text-white">
                {formatCurrency(data.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Balanço
function BalancoView({ data }: { data: BalancoPatrimonialResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Ativo" value={data.ativo.totalAtivo} />
        <KpiCard label="Total Passivo + PL" value={data.passivo.totalPassivoEPL} />
        <KpiCard
          label="Ativo Circulante"
          value={data.ativo.circulante.reduce((s, i) => s + i.valor, 0)}
        />
        <KpiCard
          label="Patrimônio Líquido"
          value={data.passivo.patrimonioLiquido.reduce((s, i) => s + i.valor, 0)}
          color="text-emerald-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ATIVO */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-blue-600 p-4">
            <p className="text-xs font-black text-white uppercase tracking-widest">ATIVO</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Circulante
              </p>
              {data.ativo.circulante.map((item) => (
                <div
                  key={item.descricao}
                  className="flex justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm text-slate-600">{item.descricao}</span>
                  <span className="text-sm font-black text-slate-900">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Não Circulante
              </p>
              {data.ativo.naoCirculante.map((item) => (
                <div
                  key={item.descricao}
                  className="flex justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm text-slate-600">{item.descricao}</span>
                  <span className="text-sm font-black text-slate-900">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t-2 border-blue-600">
              <span className="text-sm font-black text-slate-900 uppercase">Total Ativo</span>
              <span className="text-sm font-black text-blue-600">
                {formatCurrency(data.ativo.totalAtivo)}
              </span>
            </div>
          </div>
        </div>

        {/* PASSIVO + PL */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-emerald-600 p-4">
            <p className="text-xs font-black text-white uppercase tracking-widest">
              PASSIVO + PATRIMÔNIO LÍQUIDO
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Circulante
              </p>
              {data.passivo.circulante.map((item) => (
                <div
                  key={item.descricao}
                  className="flex justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm text-slate-600">{item.descricao}</span>
                  <span className="text-sm font-black text-slate-900">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Não Circulante
              </p>
              {data.passivo.naoCirculante.map((item) => (
                <div
                  key={item.descricao}
                  className="flex justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm text-slate-600">{item.descricao}</span>
                  <span className="text-sm font-black text-slate-900">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Patrimônio Líquido
              </p>
              {data.passivo.patrimonioLiquido.map((item) => (
                <div
                  key={item.descricao}
                  className="flex justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm text-slate-600">{item.descricao}</span>
                  <span className="text-sm font-black text-emerald-600">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t-2 border-emerald-600">
              <span className="text-sm font-black text-slate-900 uppercase">
                Total Passivo + PL
              </span>
              <span className="text-sm font-black text-emerald-600">
                {formatCurrency(data.passivo.totalPassivoEPL)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Equilíbrio */}
      <div
        className={`p-4 rounded-2xl border text-sm font-black text-center ${
          Math.abs(data.ativo.totalAtivo - data.passivo.totalPassivoEPL) < 1
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}
      >
        {Math.abs(data.ativo.totalAtivo - data.passivo.totalPassivoEPL) < 1
          ? '✓ Balanço Patrimonial equilibrado'
          : `⚠ Diferença de ${formatCurrency(Math.abs(data.ativo.totalAtivo - data.passivo.totalPassivoEPL))} — verificar lançamentos`}
      </div>
    </div>
  );
}

// Balancete
function BalanceteView({ data }: { data: BalanceteResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total Débitos" value={data.totalDebitos} />
        <KpiCard label="Total Créditos" value={data.totalCreditos} />
        <KpiCard
          label="Diferença"
          value={Math.abs(data.totalDebitos - data.totalCreditos)}
          color={
            Math.abs(data.totalDebitos - data.totalCreditos) < 1
              ? 'text-emerald-600'
              : 'text-rose-600'
          }
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Código
              </th>
              <th className="p-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Conta
              </th>
              <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Débitos
              </th>
              <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Créditos
              </th>
              <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.contas.map((conta) => (
              <tr key={conta.codigo} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-xs font-mono text-slate-400">{conta.codigo}</td>
                <td className="p-4 text-sm text-slate-700">{conta.nome}</td>
                <td className="p-4 text-sm text-right text-blue-600 font-bold">
                  {formatCurrency(conta.debitos)}
                </td>
                <td className="p-4 text-sm text-right text-rose-600 font-bold">
                  {formatCurrency(conta.creditos)}
                </td>
                <td
                  className={`p-4 text-sm text-right font-black ${conta.saldoAtual >= 0 ? 'text-slate-900' : 'text-rose-600'}`}
                >
                  {formatCurrency(Math.abs(conta.saldoAtual))}
                  {conta.saldoAtual < 0 && ' C'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900">
              <td
                colSpan={2}
                className="p-4 text-xs font-black text-white uppercase tracking-widest"
              >
                TOTAIS
              </td>
              <td className="p-4 text-right text-sm font-black text-blue-300">
                {formatCurrency(data.totalDebitos)}
              </td>
              <td className="p-4 text-right text-sm font-black text-rose-300">
                {formatCurrency(data.totalCreditos)}
              </td>
              <td className="p-4 text-right text-sm font-black text-white">
                {formatCurrency(Math.abs(data.totalDebitos - data.totalCreditos))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Razão
function RazaoView({ data }: { data: RazaoContabilResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Conta" value={0} />
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm col-span-2">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">
            Conta Analisada
          </p>
          <p className="text-xl font-black text-slate-900">
            {data.conta} — {data.nomeConta}
          </p>
          <p className="text-xs text-slate-400 mt-1">{data.periodo}</p>
        </div>
        <KpiCard
          label="Saldo Final"
          value={data.saldoFinal}
          color={data.saldoFinal >= 0 ? 'text-emerald-600' : 'text-rose-600'}
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Data
              </th>
              <th className="p-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Histórico
              </th>
              <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Débito
              </th>
              <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Crédito
              </th>
              <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.lancamentos.map((l, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-xs font-mono text-slate-500">
                  {new Date(l.data).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-4 text-sm text-slate-700">{l.historico}</td>
                <td className="p-4 text-sm text-right text-blue-600 font-bold">
                  {l.debito > 0 ? formatCurrency(l.debito) : '—'}
                </td>
                <td className="p-4 text-sm text-right text-rose-600 font-bold">
                  {l.credito > 0 ? formatCurrency(l.credito) : '—'}
                </td>
                <td
                  className={`p-4 text-sm text-right font-black ${l.saldo >= 0 ? 'text-slate-900' : 'text-rose-600'}`}
                >
                  {formatCurrency(Math.abs(l.saldo))}
                  {l.saldo < 0 && ' C'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900">
              <td
                colSpan={4}
                className="p-4 text-xs font-black text-white uppercase tracking-widest"
              >
                SALDO FINAL — {data.conta}
              </td>
              <td
                className={`p-4 text-right text-sm font-black ${data.saldoFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {formatCurrency(Math.abs(data.saldoFinal))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('dre');
  const [ano, setAno] = useState(ANO_ATUAL);
  const [mes, setMes] = useState(MES_ATUAL);
  const [contaCodigo, setContaCodigo] = useState('1.1.1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dreData, setDreData] = useState<DemonstrativoFinanceiroResult | null>(null);
  const [balancoData, setBalancoData] = useState<BalancoPatrimonialResult | null>(null);
  const [balanceteData, setBalanceteData] = useState<BalanceteResult | null>(null);
  const [razaoData, setRazaoData] = useState<RazaoContabilResult | null>(null);

  const companyId = useMemo(() => readCompanyId(), []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoSession() || !companyId) {
        await new Promise((r) => setTimeout(r, 600));
        if (tab === 'dre') setDreData(getDemoDRE(ano, mes));
        if (tab === 'balanco') setBalancoData(getDemoBalanco(ano));
        if (tab === 'balancete') setBalanceteData(getDemoBalancete(mes, ano));
        if (tab === 'razao') setRazaoData(getDemoRazao());
        return;
      }

      if (tab === 'dre') {
        const uc = ContabilModuleFactory.makeGenerateDreUseCase();
        const result = await uc.execute({ companyId, ano, mes });
        setDreData(result);
      }

      if (tab === 'balanco') {
        const uc = ContabilModuleFactory.makeGenerateBalancoUseCase();
        const result = await uc.execute({ companyId, ano, mes });
        setBalancoData(result);
      }

      if (tab === 'balancete') {
        const uc = ContabilModuleFactory.makeGenerateBalanceteUseCase();
        const result = await uc.execute({ companyId, mes, ano });
        setBalanceteData(result);
      }

      if (tab === 'razao') {
        const uc = ContabilModuleFactory.makeGenerateRazaoUseCase();
        const result = await uc.execute({
          companyId,
          contaCodigo,
          dataInicio: `${ano}-01-01`,
          dataFim: `${ano}-${String(mes).padStart(2, '0')}-31`,
        });
        setRazaoData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  }, [tab, ano, mes, contaCodigo, companyId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="w-full space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            bCost <span className="text-blue-500 font-normal">Relatórios</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
            DRE · Balanço Patrimonial · Balancete · Razão Contábil
          </p>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[#090d16] border border-white/5 rounded-2xl p-5 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
            Ano
          </label>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none"
          >
            {ANOS.map((a) => (
              <option key={a} value={a} className="bg-slate-900">
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
            Mês
          </label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none"
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value} className="bg-slate-900">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {tab === 'razao' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Conta
            </label>
            <input
              value={contaCodigo}
              onChange={(e) => setContaCodigo(e.target.value)}
              placeholder="ex: 1.1.1"
              className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none w-32"
            />
          </div>
        )}

        {(isDemoSession() || !companyId) && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
              Demo Mode
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        <TabButton
          active={tab === 'dre'}
          onClick={() => setTab('dre')}
          icon={<TrendingUp size={14} />}
          label="DRE"
        />
        <TabButton
          active={tab === 'balanco'}
          onClick={() => setTab('balanco')}
          icon={<Scale size={14} />}
          label="Balanço"
        />
        <TabButton
          active={tab === 'balancete'}
          onClick={() => setTab('balancete')}
          icon={<Layers3 size={14} />}
          label="Balancete"
        />
        <TabButton
          active={tab === 'razao'}
          onClick={() => setTab('razao')}
          icon={<BookOpen size={14} />}
          label="Razão"
        />
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="text-blue-500 animate-spin" size={32} />
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">
              Gerando relatório...
            </p>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {!loading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {tab === 'dre' && dreData && <DREView data={dreData} />}
          {tab === 'balanco' && balancoData && <BalancoView data={balancoData} />}
          {tab === 'balancete' && balanceteData && <BalanceteView data={balanceteData} />}
          {tab === 'razao' && razaoData && <RazaoView data={razaoData} />}
        </div>
      )}
    </div>
  );
}
