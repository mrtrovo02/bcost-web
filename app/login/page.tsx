'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  login as apiLogin,
  verifyMfa,
  getToken,
  isMfaRequiredResponse,
  type LoginResponse,
} from '@/services/api';
import { seedDemoData } from '@/services/demo-data';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [mfaSession, setMfaSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const demoModeEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' ||
    (process.env.NODE_ENV === 'development' &&
      (typeof window === 'undefined' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'));

  // Guard: redireciona se ja tem sessao ativa
  useEffect(() => {
    if (getToken()) router.replace('/dashboard/intelligence');
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (mfaSession) {
        const authData = await verifyMfa(mfaSession, otpCode);
        const token = authData?.access_token ?? authData?.accessToken ?? authData?.token;

        if (!token) throw new Error('Token de acesso nao encontrado na resposta MFA.');

        router.replace('/dashboard/intelligence');
        return;
      }

      const authData: LoginResponse = await apiLogin(email, password);

      if (isMfaRequiredResponse(authData)) {
        setMfaSession(authData.mfaSession);
        setOtpCode('');
        return;
      }

      const token = authData?.access_token ?? authData?.accessToken ?? authData?.token;

      if (!token) throw new Error('Token de acesso nao encontrado na resposta.');

      router.replace('/dashboard/intelligence');
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; response?: { status: number } };
      const message = err?.message ?? 'Falha na comunicacao com o servidor.';
      const status = err?.status ?? err?.response?.status ?? 'N/A';

      setErrorMessage(message);
      console.error('[bCost Auth]', { status, message });
    } finally {
      setIsLoading(false);
    }
  };

  const resetMfaChallenge = () => {
    setMfaSession(null);
    setOtpCode('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] text-white p-4 overflow-hidden relative font-sans">
      {/* Camada decorativa */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

      <form
        onSubmit={handleLogin}
        className="relative z-10 bg-slate-900/40 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_0_80px_-15px_rgba(37,99,235,0.1)] w-full max-w-md border border-white/10"
      >
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
              Motor bCost v7.2 Ativo
            </span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white italic">
            bCost<span className="text-blue-500 not-italic">.</span>
          </h1>
          <p className="text-slate-500 text-[11px] mt-2 font-bold uppercase tracking-[0.3em]">
            Fiscal Intelligence Unit
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-600 rounded-r-xl text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 p-1 bg-red-600 rounded-md text-white text-[8px] font-black uppercase">
                Erro
              </span>
              <p className="leading-tight">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="group space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 group-focus-within:text-blue-400 transition-colors">
              ID de Acesso Corporativo
            </label>
            <input
              required
              type="email"
              value={email}
              autoComplete="email"
              disabled={Boolean(mfaSession)}
              placeholder="contato@bcost.com.br"
              className="w-full p-4 rounded-2xl bg-black/50 border border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-800 disabled:opacity-70"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="group space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 group-focus-within:text-blue-400 transition-colors">
              Chave Criptografica
            </label>
            <input
              required
              type="password"
              value={password}
              autoComplete="current-password"
              disabled={Boolean(mfaSession)}
              placeholder="••••••••"
              className="w-full p-4 rounded-2xl bg-black/50 border border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-800 disabled:opacity-70"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mfaSession && (
            <div className="group space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 group-focus-within:text-blue-400 transition-colors">
                Código de verificação
              </label>
              <input
                required
                inputMode="text"
                minLength={6}
                maxLength={32}
                value={otpCode}
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-full p-4 rounded-2xl bg-black/50 border border-emerald-500/20 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-slate-800"
                onChange={(e) => setOtpCode(e.target.value.trim().toUpperCase())}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex justify-center items-center shadow-2xl relative overflow-hidden ${
              isLoading
                ? 'bg-slate-800 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sincronizando...
              </div>
            ) : (
              mfaSession ? 'Validar Código' : 'Acessar Terminal'
            )}
          </button>

          {mfaSession && (
            <button
              type="button"
              onClick={resetMfaChallenge}
              className="w-full py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex justify-center items-center bg-transparent border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
            >
              Trocar credenciais
            </button>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={!demoModeEnabled || Boolean(mfaSession)}
            onClick={() => {
              const seeded = seedDemoData();
              if (seeded) {
                router.replace('/dashboard/intelligence');
              }
            }}
            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex justify-center items-center bg-slate-800 border border-white/5 text-slate-300 active:scale-[0.98] ${
              !demoModeEnabled || mfaSession
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-slate-700'
            }`}
          >
            Modo Demonstração
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              Protocolo
            </span>
            <span className="text-[10px] font-black text-blue-500/60 uppercase">AES-256-GCM</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">
              Prod Ready
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
