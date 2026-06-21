'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { triggerAutoMatchApi } from '@/services/reconciliation.service';

export type ReconciliationResult = {
  autoReconciled: number;
  totalProcessed: number;
  accuracy: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isReconciliationResult(value: unknown): value is ReconciliationResult {
  return (
    isRecord(value) &&
    typeof value.autoReconciled === 'number' &&
    typeof value.totalProcessed === 'number' &&
    typeof value.accuracy === 'number'
  );
}

export const useReconciliation = (companyId: string, token: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ReconciliationResult | null>(null);

  useEffect(() => {
    if (!companyId || !token) return;

    // Conecta ao Gateway que criamos no NestJS
    const socket: Socket = io(
      `${process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.bcost.com.br'}/notifications`,
      {
        auth: { token },
        query: { companyId },
      },
    );

    socket.on('reconciliation_finished', (payload) => {
      console.log('🚀 Conciliação finalizada via WS:', payload);
      setIsProcessing(false);
      const payloadData = isRecord(payload) && 'data' in payload ? payload.data : null;
      const validResult = isReconciliationResult(payloadData) ? payloadData : null;
      setLastResult(validResult);

      if (validResult) {
        alert(`Sucesso: ${validResult.autoReconciled} transações conciliadas!`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [companyId, token]);

  const runAutoMatch = useCallback(async () => {
    setIsProcessing(true);
    try {
      await triggerAutoMatchApi(companyId, token);
    } catch (error) {
      setIsProcessing(false);
      console.error(error);
    }
  }, [companyId, token]);

  return { isProcessing, runAutoMatch, lastResult };
};
