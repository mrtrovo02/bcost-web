'use client';

import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation'; // Adicionado para navegação
import { useCompany } from '@/app/context/CompanyContext';
import { api } from '@/services/api';
import Sidebar from '@/components/Sidebar';
import {
  Trash2,
  FileText,
  ShieldCheck,
  Zap,
  Lock,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function UploadXMLPage() {
  const router = useRouter();
  const { selectedCompany } = useCompany();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const xmlFiles = selectedFiles.filter((file) => file.name.toLowerCase().endsWith('.xml'));

      if (xmlFiles.length !== selectedFiles.length) {
        setUploadStatus({
          type: 'error',
          msg: 'Apenas arquivos .XML são aceitos para conformidade fiscal.',
        });
      } else {
        setUploadStatus(null);
      }
      setFiles((prev) => [...prev, ...xmlFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length === 1 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedCompany?.id) {
      setUploadStatus({ type: 'error', msg: 'Selecione uma Unidade de Negócio na barra lateral.' });
      return;
    }
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      // Endpoint de integração com o motor de auditoria
      await api.post(`/fiscal/upload-xml/${selectedCompany.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadStatus({
        type: 'success',
        msg: `Auditoria Concluída: ${files.length} documentos processados pelo motor bCost.`,
      });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Falha na comunicação com o motor de auditoria.';

      setUploadStatus({
        type: 'error',
        msg: message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-16 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-blue-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-blue-200 flex items-center gap-2">
                <Zap size={12} /> Data Intelligence
              </span>
              <span className="bg-slate-900 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                Ciclo 2026
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[0.9]">
              Ingestão de <span className="text-blue-600">Dados XML</span>
            </h1>
            <p className="text-slate-500 font-medium mt-6 text-lg">
              Unidade:{' '}
              <span className="text-slate-900 font-extrabold underline decoration-blue-500 underline-offset-4">
                {selectedCompany?.name || 'Aguardando seleção...'}
              </span>
            </p>
          </header>

          {/* Área de Dropzone */}
          <div
            className={`group relative border-2 border-dashed rounded-[3rem] p-10 md:p-20 transition-all duration-500 text-center shadow-sm ${
              files.length > 0
                ? 'border-blue-500 bg-blue-50/30'
                : 'border-slate-300 bg-white hover:border-blue-400 hover:shadow-xl hover:shadow-blue-100/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xml"
              onChange={onFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isUploading}
            />

            <div className="space-y-6">
              <div
                className={`flex justify-center transition-all duration-700 ${isUploading ? 'scale-110' : 'group-hover:scale-105'}`}
              >
                <div className="p-8 bg-white rounded-full shadow-2xl relative border border-slate-50">
                  {isUploading ? (
                    <Loader2 className="text-blue-600 animate-spin" size={64} />
                  ) : (
                    <FileText
                      size={64}
                      className={files.length > 0 ? 'text-blue-600' : 'text-slate-300'}
                    />
                  )}
                </div>
              </div>

              <div className="max-w-sm mx-auto">
                {files.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-3xl font-black text-slate-900 leading-none">
                      {files.length} <span className="text-blue-600">Arquivos</span>
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-2 relative z-20">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
                        >
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-2xl font-black text-slate-800 tracking-tight">
                      Deposite as notas fiscais
                    </p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">
                      NFe • NFSe • CTe
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status e Navegação de Sucesso */}
          {uploadStatus && (
            <div
              className={`mt-8 p-6 rounded-[2.5rem] border-2 animate-in zoom-in-95 duration-300 ${
                uploadStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-red-50 border-red-100'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div
                    className={`h-14 w-14 rounded-full flex items-center justify-center shadow-inner ${
                      uploadStatus.type === 'success'
                        ? 'bg-emerald-200 text-emerald-700'
                        : 'bg-red-200 text-red-700'
                    }`}
                  >
                    {uploadStatus.type === 'success' ? <CheckCircle2 size={28} /> : '✕'}
                  </div>
                  <div>
                    <p
                      className={`text-lg font-black tracking-tight ${uploadStatus.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}
                    >
                      {uploadStatus.type === 'success'
                        ? 'Carga Concluída'
                        : 'Erro no Processamento'}
                    </p>
                    <p
                      className={`text-sm font-medium ${uploadStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {uploadStatus.msg}
                    </p>
                  </div>
                </div>

                {uploadStatus.type === 'success' && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                  >
                    Ver Dashboard <ArrowRight size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className={`group w-full mt-10 py-7 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl relative overflow-hidden ${
              files.length === 0 || isUploading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-blue-600 hover:-translate-y-1 active:scale-95'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isUploading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando Auditoria...
                </>
              ) : (
                'Iniciar Auditoria Digital'
              )}
            </span>
          </button>

          <footer className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-200 pt-10">
            <FooterItem icon={<ShieldCheck />} label="Precisão" desc="Análise Fiscal 2026" />
            <FooterItem icon={<Lock />} label="Segurança" desc="Dados Criptografados" />
            <FooterItem icon={<FileText />} label="Conformidade" desc="Padrão SEFAZ" />
          </footer>
        </div>
      </main>
    </div>
  );
}

function FooterItem({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="text-slate-300 group-hover:text-blue-500 mb-2 transition-colors">{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xs font-bold text-slate-800">{desc}</p>
    </div>
  );
}
