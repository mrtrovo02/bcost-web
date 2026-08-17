'use client';

import { useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { fiscalApi } from '@/lib/api/fiscal';

export default function BatchUpload({ companyId }: { companyId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatus('idle');

    try {
      await fiscalApi.uploadXmlBatch(Array.from(files), undefined, companyId);
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="relative group border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-[2rem] p-12 transition-all bg-white overflow-hidden">
      <input
        type="file"
        multiple
        accept=".xml"
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
        onChange={handleFileUpload}
        disabled={isUploading}
      />

      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div
          className={`p-6 rounded-3xl transition-all ${isUploading ? 'bg-blue-50' : 'bg-slate-50 group-hover:bg-blue-50'}`}
        >
          {isUploading ? (
            <Loader2 size={40} className="text-blue-600 animate-spin" />
          ) : (
            <UploadCloud size={40} className="text-slate-400 group-hover:text-blue-600" />
          )}
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Upload em Lote (XML)</h3>
          <p className="text-sm font-medium text-slate-500">
            Arraste suas pastas de NF-e ou NFS-e aqui
          </p>
        </div>

        {isUploading && (
          <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full animate-[progress_2s_ease-in-out_infinite]"
              style={{ width: '60%' }}
            />
          </div>
        )}

        {status === 'success' && (
          <p className="text-xs font-bold text-emerald-600">Arquivos enviados para processamento.</p>
        )}

        {status === 'error' && (
          <p className="text-xs font-bold text-rose-600">
            Não foi possível enviar os XMLs. Verifique a empresa ativa e tente novamente.
          </p>
        )}
      </div>
    </div>
  );
}
