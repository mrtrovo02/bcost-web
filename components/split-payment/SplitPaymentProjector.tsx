'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, TrendingDown, Wallet, Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface SplitPaymentProjecao {
  mes: string;
  faturamentoBruto: number;
  impostoSplit: number;
  valorRecebido: number;
  diferencaCaixaVsAnterior: number;
}

export interface SplitPaymentConfig {
  aliquotaEfetiva: number;
  meiosPagamento: {
    pix: number;
    cartao: number;
    boleto: number;
    outros: number;
  };
  faturamentoMensal: number;
}

// ---------------------------------------------------------------------------
// Motor de calculo Split Payment
// ---------------------------------------------------------------------------

const FASES_SPLIT: Record<number, { pix: number; cartao: number; boleto: number; descricao: string }> = {
  2026: { pix: 0.01, cartao: 0.01, boleto: 0.00, descricao: 'Fase piloto (2026) -- PIX e cartao' },
  2027: { pix: 0.25, cartao: 0.25, boleto: 0.10, descricao: 'Fase 1 (2027) -- expansao gradual' },
  2028: { pix: 0.50, cartao: 0.50, boleto: 0.30, descricao: 'Fase 2 (2028) -- metade dos pagamentos' },
  2029: { pix: 1.00, cartao: 1.00, boleto: 0.75, descricao: 'Fase 3 (2029) -- quase pleno' },
  2030: { pix: 1.00, cartao: 1.00, boleto: 1.00, descricao: 'Fase plena (2030+) -- todos os meios' },
};

export function calcularSplitPayment(config: SplitPaymentConfig, ano: number): SplitPaymentProjecao[] {
  const fase = FASES_SPLIT[Math.min(ano, 2030)] ?? FASES_SPLIT[2030];
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  let saldoAnterior = config.faturamentoMensal;

  return meses.map((mes, i) => {
    const crescimento = 1 + (i * 0.005);
    const faturamentoBruto = Math.round(config.faturamentoMensal * crescimento);

    const recebidoPix = faturamentoBruto * (config.meiosPagamento.pix / 100);
    const recebidoCartao = faturamentoBruto * (config.meiosPagamento.cartao / 100);
    const recebidoBoleto = faturamentoBruto * (config.meiosPagamento.boleto / 100);
    const recebidoOutros = faturamentoBruto * (config.meiosPagamento.outros / 100);

    const impostoRetidoPix = recebidoPix * config.aliquotaEfetiva * fase.pix;
    const impostoRetidoCartao = recebidoCartao * config.aliquotaEfetiva * fase.cartao;
    const impostoRetidoBoleto = recebidoBoleto * config.aliquotaEfetiva * fase.boleto;

    const impostoSplit = Math.round((impostoRetidoPix + impostoRetidoCartao + impostoRetidoBoleto) * 100) / 100;
    const valorRecebido = faturamentoBruto - impostoSplit;
    const diferencaCaixaVsAnterior = valorRecebido - saldoAnterior;

    saldoAnterior = valorRecebido;

    return { mes, faturamentoBruto, impostoSplit, valorRecebido, diferencaCaixaVsAnterior };
  });
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function pct(v: number): string {
  return v.toFixed(1).replace('.', ',') + '%';
}

// ---------------------------------------------------------------------------
// Barra de progresso
// ---------------------------------------------------------------------------

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface SplitPaymentProjectorProps {
  faturamentoMensal?: number;
  aliquotaEfetiva?: number;
}

export default function SplitPaymentProjector({
  faturamentoMensal = 150000,
  aliquotaEfetiva = 0.11,
}: SplitPaymentProjectorProps) {
  const [anoSelecionado, setAnoSelecionado] = useState(2026);
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<SplitPaymentConfig>({
    aliquotaEfetiva,
    faturamentoMensal,
    meiosPagamento: { pix: 60, cartao: 25, boleto: 10, outros: 5 },
  });

  const projecao = useMemo(() => calcularSplitPayment(config, anoSelecionado), [config, anoSelecionado]);

  const totalImposto = projecao.reduce((s, m) => s + m.impostoSplit, 0);
  const totalRecebido = projecao.reduce((s, m) => s + m.valorRecebido, 0);
  const totalBruto = projecao.reduce((s, m) => s + m.faturamentoBruto, 0);
  const impactoPercentual = totalBruto > 0 ? (totalImposto / totalBruto) * 100 : 0;
  const fase = FASES_SPLIT[Math.min(anoSelecionado, 2030)];
  const maxImposto = Math.max(...projecao.map((m) => m.impostoSplit), 1);

  return (
    <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-slate-900 p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center justify-center">
                <TrendingDown size={14} className="text-rose-400" />
              </div>
              <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">
                Split Payment -- Reforma Tributaria 2026
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Projetor de Impacto no Fluxo de Caixa
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl">
              O Split Payment desconta o imposto automaticamente no momento do recebimento via PIX, cartao e boleto.
              Simule o impacto real no seu caixa mes a mes.
            </p>
            <div className="mt-3 text-xs text-slate-500 bg-white/5 border border-white/10 rounded-xl px-3 py-2 inline-block">
              {fase?.descricao}
            </div>
          </div>

          {/* KPIs principais */}
          <div className="flex flex-col gap-3 flex-shrink-0">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-4 text-right">
              <p className="text-[9px] font-black uppercase text-rose-400/70 tracking-widest">Imposto retido no ano</p>
              <p className="text-xl font-black text-rose-400 mt-1">{fmt(totalImposto)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-right">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Impacto no caixa</p>
              <p className="text-xl font-black text-amber-400 mt-1">{pct(impactoPercentual)}</p>
            </div>
          </div>
        </div>

        {/* Seletor de ano */}
        <div className="flex flex-wrap gap-2 mt-6">
          {[2026, 2027, 2028, 2029, 2030].map((ano) => (
            <button
              key={ano}
              onClick={() => setAnoSelecionado(ano)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                anoSelecionado === ano
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {ano}
            </button>
          ))}
        </div>
      </div>

      {/* Configuracoes */}
      <div className="border-b border-slate-100">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calculator size={14} className="text-slate-400" />
            <span className="text-xs font-black uppercase text-slate-500 tracking-widest">
              Configurar simulacao
            </span>
          </div>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>

        {expanded && (
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-200">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                Faturamento mensal (R$)
              </label>
              <input
                type="number"
                value={config.faturamentoMensal}
                onChange={(e) => setConfig((c) => ({ ...c, faturamentoMensal: Number(e.target.value) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                Aliquota efetiva (ex: 0.11 para 11%)
              </label>
              <input
                type="number"
                step="0.001"
                value={config.aliquotaEfetiva}
                onChange={(e) => setConfig((c) => ({ ...c, aliquotaEfetiva: Number(e.target.value) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                Mix de meios de pagamento (total deve = 100%)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['pix', 'cartao', 'boleto', 'outros'] as const).map((meio) => (
                  <div key={meio} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase w-14">{meio}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config.meiosPagamento[meio]}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          meiosPagamento: { ...c.meiosPagamento, [meio]: Number(e.target.value) },
                        }))
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                    />
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grafico de barras mensal */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Info size={12} className="text-slate-400" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Imposto retido automaticamente por mes -- {anoSelecionado}
          </p>
        </div>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {projecao.map((m) => (
            <div key={m.mes} className="flex flex-col items-center gap-1">
              <div className="relative w-full flex flex-col justify-end" style={{ height: 80 }}>
                <div
                  className="w-full bg-rose-500/20 border border-rose-500/30 rounded-t-lg transition-all hover:bg-rose-500/30"
                  style={{ height: `${Math.max(4, (m.impostoSplit / maxImposto) * 100)}%` }}
                  title={`${m.mes}: ${fmt(m.impostoSplit)} retido`}
                />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase">{m.mes}</span>
              <span className="text-[8px] text-rose-400 font-black">{fmt(m.impostoSplit)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela detalhada */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-t border-b border-slate-100">
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Mes</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Faturamento</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Imposto Retido</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor Recebido</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Variacao Caixa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {projecao.map((m) => (
              <tr key={m.mes} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-xs font-black text-slate-700 uppercase">{m.mes}</td>
                <td className="p-4 text-xs font-bold text-slate-600 text-right">{fmt(m.faturamentoBruto)}</td>
                <td className="p-4 text-xs font-black text-rose-600 text-right">{fmt(m.impostoSplit)}</td>
                <td className="p-4 text-xs font-black text-slate-900 text-right">{fmt(m.valorRecebido)}</td>
                <td className="p-4 text-right">
                  <span className={`text-xs font-black ${m.diferencaCaixaVsAnterior >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.diferencaCaixaVsAnterior >= 0 ? '+' : ''}{fmt(m.diferencaCaixaVsAnterior)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900">
              <td className="p-4 text-[10px] font-black text-white uppercase tracking-widest">TOTAL {anoSelecionado}</td>
              <td className="p-4 text-xs font-black text-slate-300 text-right">{fmt(totalBruto)}</td>
              <td className="p-4 text-xs font-black text-rose-400 text-right">{fmt(totalImposto)}</td>
              <td className="p-4 text-xs font-black text-emerald-400 text-right">{fmt(totalRecebido)}</td>
              <td className="p-4 text-xs font-black text-amber-400 text-right">
                -{pct(impactoPercentual)} do caixa
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Alerta de acao */}
      <div className="m-6 bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4">
        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">
            Acao recomendada pelo bCost
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Com o Split Payment, voce nao vai receber o valor integral das vendas. Em {anoSelecionado},
            o impacto estimado e de <strong>{fmt(totalImposto)}</strong> retidos automaticamente.
            Ajuste seu capital de giro e negocie prazos de pagamento com fornecedores antes de {anoSelecionado}.
          </p>
        </div>
      </div>
    </div>
  );
}