'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import {
  CBS_IBS_TRANSITION,
  TAX_REFORM_OFFICIAL_SOURCES,
} from '@/lib/tax-reform/official-data';

const DEADLINE = new Date(`${CBS_IBS_TRANSITION.testStartDate}T00:00:00-03:00`);

function useDaysRemaining(): number {
  const [days, setDays] = useState(0);
  useEffect(() => {
    const calc = () => {
      const diff = DEADLINE.getTime() - Date.now();
      setDays(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, []);
  return days;
}

const CBS_RATE = CBS_IBS_TRANSITION.cbsRate;
const IBS_RATE = CBS_IBS_TRANSITION.ibsRate;

export interface CbsIbsImpact {
  baseValue: number;
  cbs: number;
  ibs: number;
  total: number;
}

export function calcularCbsIbs(valorBase: number): CbsIbsImpact {
  const cbs = Math.round(valorBase * CBS_RATE * 100) / 100;
  const ibs = Math.round(valorBase * IBS_RATE * 100) / 100;
  return { baseValue: valorBase, cbs, ibs, total: cbs + ibs };
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LINK_CLASS = 'flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors';

interface CbsIbsAlertBannerProps {
  estimatedMonthlyRevenue?: number;
  dismissible?: boolean;
  compact?: boolean;
}

export default function CbsIbsAlertBanner({ estimatedMonthlyRevenue = 0, dismissible = true, compact = false }: CbsIbsAlertBannerProps) {
  const days = useDaysRemaining();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(sessionStorage.getItem('bcost_cbs_ibs_dismissed') === 'true');
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('bcost_cbs_ibs_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  const impact = estimatedMonthlyRevenue > 0 ? calcularCbsIbs(estimatedMonthlyRevenue) : null;

  const urgencyColor = days <= 7 ? 'border-red-500/40 bg-red-500/10' : days <= 21 ? 'border-orange-500/40 bg-orange-500/10' : 'border-amber-500/40 bg-amber-500/10';
  const badgeColor = days <= 7 ? 'bg-red-500 text-white' : days <= 21 ? 'bg-orange-500 text-white' : 'bg-amber-500 text-white';
  const iconColor = days <= 7 ? 'text-red-400' : days <= 21 ? 'text-orange-400' : 'text-amber-400';

  if (compact) {
    return (
      <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${urgencyColor}`}>
        <AlertTriangle size={14} className={iconColor} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-white">
            CBS/IBS em fase de teste a partir de {CBS_IBS_TRANSITION.displayStartDate}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">CBS 0,9% + IBS 0,1% como destaque operacional</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex-shrink-0 ${badgeColor}`}>{days}d</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${urgencyColor}`}>
      <div className="flex items-start gap-4 p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${urgencyColor}`}>
          <AlertTriangle size={18} className={iconColor} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${badgeColor}`}>
              ATENCAO -- {days} dia{days !== 1 ? 's' : ''} restante{days !== 1 ? 's' : ''}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-white/5 text-slate-300 border border-white/10">
              {CBS_IBS_TRANSITION.phaseLabel}
            </span>
          </div>

          <h3 className="text-sm font-black text-white">
            CBS/IBS em NF-e a partir de {CBS_IBS_TRANSITION.displayStartDate}
          </h3>

          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            A partir de {CBS_IBS_TRANSITION.displayStartDate}, prepare a operacao para destacar{' '}
            <span className="text-white font-bold">CBS (0,9%)</span> e{' '}
            <span className="text-white font-bold">IBS (0,1%)</span> nos documentos fiscais. Em 2026,
            trate os valores como teste de adaptacao, sem confundir com recolhimento definitivo.
          </p>

          {impact && (
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">CBS (0,9%)</p>
                <p className="text-sm font-black text-amber-400">{formatBRL(impact.cbs)}/mes</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">IBS (0,1%)</p>
                <p className="text-sm font-black text-orange-400">{formatBRL(impact.ibs)}/mes</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Teste Total</p>
                <p className="text-sm font-black text-red-400">{formatBRL(impact.total)}/mes</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setExpanded((v) => !v)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {dismissible && (
            <button onClick={handleDismiss} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">O que e CBS</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Contribuicao sobre Bens e Servicos -- substituira PIS/COFINS. Percentual de teste de{' '}
                <span className="text-amber-400 font-bold">0,9%</span> sobre o valor da nota.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">O que e IBS</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Imposto sobre Bens e Servicos -- substituira ICMS/ISS. Percentual de teste de{' '}
                <span className="text-orange-400 font-bold">0,1%</span> na fase inicial.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Leitura juridica</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {CBS_IBS_TRANSITION.operationalNote}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={TAX_REFORM_OFFICIAL_SOURCES.revenueTaxReform} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              <ExternalLink size={12} />
              Receita Federal -- Reforma Tributaria
            </a>
            <a href={TAX_REFORM_OFFICIAL_SOURCES.constitutionalAmendment132} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              <ExternalLink size={12} />
              EC 132/2023 -- Emenda Constitucional
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
