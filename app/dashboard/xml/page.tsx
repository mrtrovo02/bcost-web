'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '@/services/api';
import { useCompany } from '@/app/context/CompanyContext';
import {
  FileUp,
  Loader2,
  FileText,
  CheckCircle2,
  Trash2,
  Database,
  Shield,
  AlertCircle,
} from 'lucide-react';

interface UploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

export default function XMLUploadPage() {
  const { selectedCompany } = useCompany();
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Manipulador de arquivos adicionados
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map((file) => ({
      file,
      status: 'pending' as const,
    }));
    setUploads((prev) => [...newUploads, ...prev]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/xml': ['.xml'] },
    disabled: !selectedCompany || isProcessing,
  });

  // Lógica Real de Integração com o Backend NestJS
  const handleProcessBatch = async () => {
    if (!selectedCompany?.id || uploads.length === 0) return;

    setIsProcessing(true);

    // Filtra apenas os que ainda não foram enviados com sucesso
    const pendingUploads = uploads.filter((u) => u.status !== 'success');

    // Prepara o FormData (Necessário para envio de arquivos)
    const formData = new FormData();
    pendingUploads.forEach((u) => {
      formData.append('files', u.file);
    });

    // Atualiza UI para 'uploading'
    setUploads((prev) =>
      prev.map((u) => (u.status === 'pending' ? { ...u, status: 'uploading' } : u)),
    );

    try {
      // Chamada para o seu endpoint NestJS
      // Nota: Ajuste a rota se o seu controller usar um nome diferente
      await api.post(`/fiscal/upload/${selectedCompany.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Sucesso Total
      setUploads((prev) =>
        prev.map((u) => ({ ...u, status: 'success', message: 'Processado via Prisma' })),
      );

      // Dica: Aqui você poderia disparar um toast de sucesso
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erro no processamento bCost:', message);

      // Marca como erro na UI
      setUploads((prev) =>
        prev.map((u) =>
          u.status === 'uploading'
            ? { ...u, status: 'error', message: 'Falha na validação SEFAZ' }
            : u,
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header com Branding bCost */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
            Ingestão <span className="text-blue-600 italic">bCost</span> XML
          </h2>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
            Motor de cálculo em tempo real 2026
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setUploads([])}
            disabled={isProcessing}
            className="px-6 py-3 rounded-2xl font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center gap-2 disabled:opacity-30"
          >
            <Trash2 size={18} /> Limpar lista
          </button>
          <button
            disabled={isProcessing || !uploads.some((u) => u.status === 'pending')}
            onClick={handleProcessBatch}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all disabled:opacity-30 flex items-center gap-2"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
            {isProcessing ? 'Sincronizando Prisma...' : 'Iniciar processamento'}
          </button>
        </div>
      </div>

      {/* Zona de Drop Profissional */}
      <div
        {...getRootProps()}
        className={`
          relative border-4 border-dashed rounded-[3rem] p-16 transition-all cursor-pointer
          flex flex-col items-center justify-center gap-4 text-center
          ${isDragActive ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-slate-200 bg-white hover:border-blue-200 shadow-sm'}
          ${!selectedCompany ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}
        `}
      >
        <input {...getInputProps()} />

        {!selectedCompany ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-black text-slate-800 uppercase tracking-tight italic">
                Ação Bloqueada
              </p>
              <p className="text-slate-500 font-medium">
                Selecione uma empresa na barra lateral para habilitar o upload.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-2 shadow-inner">
              <FileUp size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                Envie seus arquivos XML aqui
              </p>
              <p className="text-slate-400 font-medium italic">
                NF-e, NFS-e e CT-e compatíveis com o motor bCost
              </p>
            </div>
          </>
        )}
      </div>

      {/* Listagem de Arquivos com Status Real */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in zoom-in-95 duration-300">
          {uploads.map((u, index) => (
            <div
              key={index}
              className="bg-white border border-slate-100 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:border-blue-100 transition-all relative overflow-hidden group"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  u.status === 'success'
                    ? 'bg-emerald-50 text-emerald-500'
                    : u.status === 'error'
                      ? 'bg-rose-50 text-rose-500'
                      : u.status === 'uploading'
                        ? 'bg-blue-50 text-blue-500'
                        : 'bg-slate-50 text-slate-400'
                }`}
              >
                {u.status === 'success' ? (
                  <CheckCircle2 size={24} />
                ) : u.status === 'uploading' ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : u.status === 'error' ? (
                  <AlertCircle size={24} />
                ) : (
                  <FileText size={24} />
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-black text-slate-800 truncate">{u.file.name}</p>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      u.status === 'success'
                        ? 'text-emerald-500'
                        : u.status === 'error'
                          ? 'text-rose-500'
                          : 'text-slate-400'
                    }`}
                  >
                    {u.status === 'uploading'
                      ? 'Lendo Tags XML...'
                      : u.status === 'success'
                        ? 'Integrado'
                        : u.status === 'error'
                          ? 'Erro'
                          : 'Pendente'}
                  </p>
                  {u.status === 'success' && (
                    <div className="h-1 w-1 bg-emerald-500 rounded-full" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card de Compliance - Valor Comercial */}
      <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden border border-slate-800 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <Shield className="text-white" size={40} />
          </div>
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="bg-blue-500 text-[10px] font-black px-2 py-0.5 rounded text-white uppercase tracking-tighter">
                Enterprise Grade
              </span>
              <h3 className="text-2xl font-black tracking-tight italic">
                Protocolo de Segurança Prisma Engine
              </h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl font-medium">
              A bCost garante a integridade dos dados através de criptografia{' '}
              <span className="text-white font-bold text-xs px-1.5 py-0.5 bg-white/5 rounded">
                AES-256
              </span>
              . Ao processar seus XMLs, realizamos automaticamente o{' '}
              <span className="text-blue-400">cruzamento de dados fiscal</span>, identificando
              oportunidades de economia no Simples Nacional e prevenindo bitributação de ICMS-ST.
            </p>
          </div>
        </div>

        {/* Decorativo */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}
