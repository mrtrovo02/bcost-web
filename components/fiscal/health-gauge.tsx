'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface HealthGaugeProps {
  data: {
    usagePercent?: number | string;
    rbt12?: number;
  };
}

export function HealthGauge({ data }: HealthGaugeProps) {
  const usage = Number.parseFloat(String(data?.usagePercent ?? 0)) || 0;

  const chartData = [{ value: usage }, { value: Math.max(0, 100 - usage) }];

  const usageColor = usage > 80 ? '#ef4444' : usage > 60 ? '#f59e0b' : '#2563eb';

  return (
    <div className="flex flex-col items-center rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
      <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Saúde Fiscal (RBT12)
      </h4>

      <div className="relative h-[260px] min-h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={85}
              startAngle={180}
              endAngle={0}
              stroke="none"
            >
              <Cell fill={usageColor} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-12">
          <span className="text-4xl font-black tracking-tighter text-slate-900">{usage}%</span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-lg font-black text-slate-900">
          R$ {(data?.rbt12 || 0).toLocaleString('pt-BR')}
        </p>

        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Limite Simples: 4.8M
        </p>
      </div>
    </div>
  );
}
