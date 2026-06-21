'use client';

import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function FiscalHealthBadge({
  status = 'secure',
}: {
  status?: 'secure' | 'warning' | 'danger';
}) {
  const configs = {
    secure: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      icon: CheckCircle2,
      label: 'Saúde Fiscal: Excelente',
      desc: 'Sua empresa está em conformidade total com o Fator R.',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
      icon: AlertCircle,
      label: 'Atenção Necessária',
      desc: 'Proporção Folha/Faturamento próxima ao limite de 28%.',
    },
    danger: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-100',
      icon: ShieldCheck,
      label: 'Risco de Reenquadramento',
      desc: 'Ação necessária para evitar o Anexo V este mês.',
    },
  };

  const current = configs[status];
  const Icon = current.icon;

  return (
    <div
      className={`${current.bg} ${current.border} border p-5 rounded-[2rem] flex items-center gap-4 transition-all hover:shadow-md`}
    >
      <div className={`${current.text} p-3 bg-white rounded-2xl shadow-sm`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className={`${current.text} font-black text-sm uppercase tracking-tight`}>
          {current.label}
        </h4>
        <p className="text-slate-500 text-xs font-medium">{current.desc}</p>
      </div>
    </div>
  );
}
