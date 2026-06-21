'use client';

import { useState, type ChangeEvent } from 'react';
import { fiscalApi } from '@/lib/api/fiscal';
import { XmlDocumentType } from '../lib/types/fiscal';
import { Upload, X, FileText } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<XmlDocumentType>(XmlDocumentType.NFE);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      // Usando nossa API blindada que já resolve o ID da empresa
      await fiscalApi.uploadXmlBatch(files, uploadType);

      onSuccess();
      setFiles([]);
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erro no upload bCost:', message);
      alert(message || 'Falha ao processar lote de XML.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] w-full max-w-xl shadow-2xl transition-all">
        {/* Header do Modal */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
              Engine de <span className="text-blue-600">Ingestão</span>
            </h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
              Batch Processing 1.0
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Seletor de Tipo de XML */}
        <div className="flex gap-2 mb-6">
          {Object.values(XmlDocumentType).map((type) => (
            <button
              key={type}
              onClick={() => setUploadType(type)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                uploadType === type
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-transparent border-slate-200 dark:border-white/5 text-slate-400 hover:border-slate-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Dropzone */}
        <div
          className={`relative border-2 border-dashed rounded-[2rem] p-10 text-center transition-all duration-300 ${
            files.length > 0
              ? 'border-blue-500/50 bg-blue-500/5'
              : 'border-slate-200 dark:border-white/10 hover:border-blue-400/50 hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".xml"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
              <Upload size={32} />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {files.length > 0
                ? `${files.length} arquivos selecionados`
                : 'Arraste seus arquivos XML ou clique aqui'}
            </p>
            <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-tighter">
              NFe, NFSe ou CTe (máx 50mb por lote)
            </p>
          </div>
        </div>

        {/* Lista de Arquivos (Scrollable) */}
        {files.length > 0 && (
          <div className="mt-6 max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-blue-500" />
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                    {f.name}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="mt-8 flex gap-4">
          <button
            disabled={isUploading}
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button
            disabled={files.length === 0 || isUploading}
            onClick={handleUpload}
            className="flex-[2] py-4 bg-slate-900 dark:bg-blue-600 disabled:opacity-20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando Lote...
              </>
            ) : (
              'Iniciar Auditoria em Lote'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
