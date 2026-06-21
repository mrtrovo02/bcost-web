'use client';

import { useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

export default function BatchUpload({ companyId }: { companyId: string }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);

    // Processamento em lote (Batch)
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    formData.append('companyId', companyId);

    try {
      const response = await fetch('/api/fiscal/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Notificação de sucesso
      }
    } finally {
      setIsUploading(false);
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
      </div>
    </div>
  );
}
