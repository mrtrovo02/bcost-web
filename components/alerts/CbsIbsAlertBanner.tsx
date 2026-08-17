'use client';

import { useState } from 'react';
import { AlertTriangle, Info, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { CBS_IBS_TRANSITION, TAX_REFORM_OFFICIAL_SOURCES } from '@/lib/tax-reform/official-data';

/**
 * Banner informativo de calibração CBS/IBS.
 *
 * CORRIGIDO: o período de 2026 tem recolhimento DISPENSADO (apuração
 * meramente informativa), conforme Decreto Federal 12.955/2026, Livro I,
 * art. 464. Este componente NÃO deve comunicar urgência de "prazo/multa" —
 * usa tom informativo (azul/âmbar neutro), nunca vermelho de alerta crítico.
 */

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

const LINK_CLASS =
  'flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors';

interface CbsIbsAlertBannerProps {
  estimatedMonthlyRevenue?: number;
  dismissible?: boolean;
  compact?: boolean;
}

export default function CbsIbsAlertBanner({
  estimatedMonthlyRevenue = 0,
  dismissible = true,
  compact = false,
}: CbsIbsAlertBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('bcost_cbs_ibs_dismissed') === 'true';
  });
  const [expanded, setExpanded] = useState(false);

  const handleDismiss = () => {
    sessionStorage.setItem('bcost_cbs_ibs_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  const impact = estimatedMonthlyRevenue > 0 ? calcularCbsIbs(estimatedMonthlyRevenue) : null;

  // Tom sempre informativo (âmbar/azul) — nunca vermelho de "risco iminente",
  // já que o recolhimento é dispensado em 2026 (apuração informativa).
  const toneClass = 'border-blue-500/30 bg-blue-500/10';
  const badgeClass = 'bg-blue-500 text-white';
  const iconClass = 'text-blue-400';

  if (compact) {
    return (
      <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${toneClass}`}>
        <Info size={14} className={iconClass} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-white">CBS/IBS — {CBS_IBS_TRANSITION.phaseLabel}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Destaque informativo (CBS {(CBS_RATE * 100).toFixed(1)}% + IBS{' '}
            {(IBS_RATE * 100).toFixed(1)}%) — recolhimento dispensado em 2026 se cumpridas as
            obrigações acessórias.
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black flex-shrink-0 ${badgeClass}`}
        >
          Info
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${toneClass}`}>
      <div className="flex items-start gap-4 p-5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${toneClass}`}
        >
          <AlertTriangle size={18} className={iconClass} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${badgeClass}`}>
              INFORMATIVO
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-white/5 text-slate-300 border border-white/10">
              {CBS_IBS_TRANSITION.phaseLabel}
            </span>
          </div>

          <h3 className="text-sm font-black text-white">
            CBS/IBS nos documentos fiscais a partir de {CBS_IBS_TRANSITION.displayStartDate}
          </h3>

          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {CBS_IBS_TRANSITION.operationalNote}
          </p>

          {impact && (
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  CBS ({(CBS_RATE * 100).toFixed(1)}%)
                </p>
                <p className="text-sm font-black text-amber-400">{formatBRL(impact.cbs)}/mês</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  IBS ({(IBS_RATE * 100).toFixed(1)}%)
                </p>
                <p className="text-sm font-black text-orange-400">{formatBRL(impact.ibs)}/mês</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  Destaque total (informativo)
                </p>
                <p className="text-sm font-black text-blue-300">{formatBRL(impact.total)}/mês</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label={expanded ? 'Recolher detalhes' : 'Expandir detalhes'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Fechar aviso"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                O que é CBS
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Contribuição sobre Bens e Serviços — substituirá PIS/COFINS. Percentual de
                calibração de{' '}
                <span className="text-amber-400 font-bold">{(CBS_RATE * 100).toFixed(1)}%</span>{' '}
                sobre o valor da nota em 2026.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                O que é IBS
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Imposto sobre Bens e Serviços — substituirá ICMS/ISS. Percentual de calibração de{' '}
                <span className="text-orange-400 font-bold">{(IBS_RATE * 100).toFixed(1)}%</span> na
                fase inicial (2026).
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                Leitura jurídica
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {CBS_IBS_TRANSITION.legalCitation}. Recolhimento dispensado no período de{' '}
                {CBS_IBS_TRANSITION.dispensedFrom.split('-').reverse().join('/')} a{' '}
                {CBS_IBS_TRANSITION.dispensedTo.split('-').reverse().join('/')}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={TAX_REFORM_OFFICIAL_SOURCES.revenueGuidance2026}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              <ExternalLink size={12} />
              Receita Federal — Orientações 2026
            </a>
            <a
              href={TAX_REFORM_OFFICIAL_SOURCES.complementaryLaw214}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              <ExternalLink size={12} />
              LC 214/2025 — Lei Complementar
            </a>
            <a
              href={TAX_REFORM_OFFICIAL_SOURCES.constitutionalAmendment132}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              <ExternalLink size={12} />
              EC 132/2023 — Emenda Constitucional
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
