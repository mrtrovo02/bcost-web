'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import type { ReconciliationResult } from '@/app/hooks/use-reconciliation';

interface StatusProps {
  isProcessing: boolean;
  result: ReconciliationResult | null;
}

export function ReconciliationStatus({ isProcessing, result }: StatusProps) {
  if (!isProcessing && !result) return null;

  return (
    <div
      className={`mt-6 p-4 rounded-xl border transition-all ${
        isProcessing ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {isProcessing ? (
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        )}
        <h3 className={`font-semibold ${isProcessing ? 'text-blue-900' : 'text-green-900'}`}>
          {isProcessing ? 'IA bCost está trabalhando...' : 'Conciliação Finalizada!'}
        </h3>
      </div>

      {!isProcessing && result && (
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-gray-500">Processados</span>
            <span className="font-bold text-gray-800">{result.totalProcessed}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Conciliados</span>
            <span className="font-bold text-green-700">{result.autoReconciled}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Precisão</span>
            <span className="font-bold text-blue-700">{result.accuracy}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
