'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="max-w-xl rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-500">Erro inesperado</p>
        <h1 className="mt-4 text-3xl font-black text-slate-950">Algo deu errado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          A aplicação encontrou um erro inesperado. Tente novamente para recuperar a experiência
          automaticamente.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
