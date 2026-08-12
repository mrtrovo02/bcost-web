'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fiscalApi } from '@/lib/api/fiscal';
import { Invoice } from '../../../lib/types/fiscal';
import UploadModal from '../../../components/UploadModal';
import { getDemoInvoices } from '@/services/demo-data';
import { isDemoSession } from '@/services/api';
import { calcularCbsIbs } from '@/components/alerts/CbsIbsAlertBanner';
import {
  Search,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';

function getInvoiceTaxImpact(invoice: Invoice) {
  const payload = invoice.taxReformPayload;
  if (payload?.group === 'UB') {
    const cbs = payload.cbsValue ?? 0;
    const ibs = payload.ibsValue ?? 0;
    const selectiveTax = payload.selectiveTaxValue ?? 0;

    return {
      baseValue: invoice.value ?? 0,
      cbs,
      ibs,
      selectiveTax,
      total: cbs + ibs + selectiveTax,
      source: 'xml' as const,
    };
  }

  return {
    ...calcularCbsIbs(invoice.value ?? 0),
    selectiveTax: 0,
    source: 'estimated' as const,
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isDemoSession()) {
        const demoData = getDemoInvoices();
        setInvoices(Array.isArray(demoData) ? demoData : []);
        return;
      }
      const data = await fiscalApi.getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      if (isDemoSession()) {
        const demoData = getDemoInvoices();
        setInvoices(Array.isArray(demoData) ? demoData : []);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error('🔴 [bCost Invoices Engine Error]:', message);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const safeSearch = (searchTerm ?? '').toLowerCase();

    return safeInvoices.filter((inv) => {
      if (!inv) return false;
      const invoiceNumber = (inv.number ?? '').toString().toLowerCase();
      const invoiceIssuer = (inv.issuer ?? '').toString().toLowerCase();
      const matchesSearch =
        invoiceNumber.includes(safeSearch) || invoiceIssuer.includes(safeSearch);
      const matchesStatus = filterStatus === 'ALL' || inv.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, filterStatus]);

  // Totalizadores CBS/IBS do lote exibido
  const totaisCbsIbs = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, nf) => {
        const impact = getInvoiceTaxImpact(nf);
        return {
          baseValue: acc.baseValue + impact.baseValue,
          cbs: acc.cbs + impact.cbs,
          ibs: acc.ibs + impact.ibs,
          selectiveTax: acc.selectiveTax + impact.selectiveTax,
          total: acc.total + impact.total,
          audited: acc.audited + (impact.source === 'xml' ? 1 : 0),
        };
      },
      { baseValue: 0, cbs: 0, ibs: 0, selectiveTax: 0, total: 0, audited: 0 },
    );
  }, [filteredInvoices]);

  return (
    <div className="p-8 space-y-8 bg-[#fcfdfe] min-h-screen animate-in fade-in duration-700">
      {/* Header Estratégico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            Notas <span className="text-blue-600">Fiscais</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            Engine de Auditoria e Repositório Digital
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-slate-200 active:scale-95"
        >
          <FileSpreadsheet size={16} className="group-hover:rotate-12 transition-transform" />
          Importar Lote XML
        </button>
      </div>

      {/* Painel CBS/IBS do lote */}
      {filteredInvoices.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-white rounded-[2rem] border border-amber-100 shadow-sm">
          <div className="col-span-2 lg:col-span-1 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                CBS/IBS
              </p>
              <p className="text-xs font-black text-slate-700">
                {totaisCbsIbs.audited > 0
                  ? `${totaisCbsIbs.audited} XML com Grupo UB`
                  : 'Impacto estimado do lote'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
              CBS (0,9%)
            </p>
            <p className="text-sm font-black text-amber-600">
              {totaisCbsIbs.cbs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
              IBS (0,1%)
            </p>
            <p className="text-sm font-black text-orange-600">
              {totaisCbsIbs.ibs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
              Total CBS+IBS+IS
            </p>
            <p className="text-sm font-black text-red-600">
              {totaisCbsIbs.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar de Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input
            type="text"
            placeholder="Buscar por número ou emissor..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 ring-blue-500/10 focus:border-blue-500 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <select
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-[11px] font-bold text-slate-600 outline-none cursor-pointer appearance-none hover:bg-slate-100 transition-colors"
            onChange={(e) => setFilterStatus(e.target.value)}
            value={filterStatus}
          >
            <option value="ALL">TODOS OS STATUS</option>
            <option value="VALID">AUDITADOS</option>
            <option value="PENDING">EM ANÁLISE</option>
            <option value="INVALID">INCONSISTENTES</option>
          </select>
        </div>
        <div className="flex items-center justify-center bg-blue-50 rounded-xl px-4 text-[10px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">
          {filteredInvoices.length} Documentos
        </div>
      </div>

      {/* Tabela de Auditoria */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Documento / Ref
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Emissor
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                Valor Total
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                CBS + IBS
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                Status Auditoria
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="p-8 h-20 bg-slate-50/30" />
                </tr>
              ))
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-32 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="text-slate-200" size={48} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nenhum XML encontrado no banco de dados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((nf) => {
                const impact = getInvoiceTaxImpact(nf);
                return (
                  <tr
                    key={nf?.id}
                    className="hover:bg-slate-50/80 transition-all group cursor-default"
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <FileSpreadsheet size={18} />
                        </div>
                        <div>
                          <p className="text-[12px] font-black text-slate-900 tracking-tighter uppercase">
                            {nf?.type ?? 'NFe'} #{nf?.number ?? 'S/N'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            Auditado em{' '}
                            {nf?.date
                              ? new Date(nf.date).toLocaleDateString('pt-BR')
                              : 'Data Indisponível'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-[11px] font-bold text-slate-600 uppercase truncate max-w-[200px]">
                        {nf?.issuer ?? 'Emissor Não Identificado'}
                      </p>
                    </td>
                    <td className="p-6 text-right">
                      <p className="text-[13px] font-black text-slate-900">
                        {(nf?.value ?? 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </td>
                    <td className="p-6 text-right">
                      <p className="text-[11px] font-black text-amber-600">
                        {impact.total.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        CBS{' '}
                        {impact.cbs.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}{' '}
                        + IBS{' '}
                        {impact.ibs.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                        {impact.selectiveTax > 0 ? (
                          <>
                            {' '}
                            + IS{' '}
                            {impact.selectiveTax.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </>
                        ) : null}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {impact.source === 'xml'
                          ? 'Valor auditado no Grupo UB'
                          : 'Estimativa 2026 sobre valor da nota'}
                      </p>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center">
                        <span
                          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            nf?.status === 'VALID'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : nf?.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-red-50 text-red-600 border-red-100'
                          }`}
                        >
                          {nf?.status === 'VALID' ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {nf?.status === 'VALID'
                            ? 'Auditado'
                            : nf?.status === 'PENDING'
                              ? 'Processando'
                              : 'Inconsistente'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredInvoices.length > 0 && (
            <tfoot>
              <tr className="bg-slate-900">
                <td
                  colSpan={2}
                  className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >
                  TOTAL DO LOTE — {filteredInvoices.length} documentos
                </td>
                <td className="p-5 text-right text-sm font-black text-white">
                  {totaisCbsIbs.baseValue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td className="p-5 text-right text-sm font-black text-amber-400">
                  {totaisCbsIbs.total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchInvoices}
      />
    </div>
  );
}
