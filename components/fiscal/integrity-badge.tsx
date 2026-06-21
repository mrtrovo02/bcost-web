'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

/**
 * Interface sincronizada com a FiscalStore e types/fiscal.ts
 * Resolve o erro TS2322 ao incluir 'AUDIT_REQUIRED'
 */
interface IntegrityBadgeProps {
  status: 'VALID' | 'WARNING' | 'AUDIT_REQUIRED';
}

export function IntegrityBadge({ status }: IntegrityBadgeProps) {
  /**
   * Mapeamento de Estados (Estratégia Full Stack para evitar IFs aninhados)
   */
  const config = {
    VALID: {
      colorClass: 'bg-emerald-50 border-emerald-100 text-emerald-600',
      icon: <ShieldCheck size={14} className="text-emerald-500" />,
      label: 'Cálculos Auditados bCost',
    },
    WARNING: {
      colorClass: 'bg-amber-50 border-amber-100 text-amber-600',
      icon: <ShieldAlert size={14} className="animate-pulse text-amber-500" />,
      label: 'Auditoria: Atenção Necessária',
    },
    AUDIT_REQUIRED: {
      colorClass: 'bg-blue-50 border-blue-100 text-blue-600',
      icon: <ShieldQuestion size={14} className="text-blue-500" />,
      label: 'Sincronização Pendente',
    },
  };

  // Fallback de segurança caso venha um status inesperado
  const current = config[status] || config.AUDIT_REQUIRED;

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 hover:shadow-sm ${current.colorClass}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </div>
  );
}
