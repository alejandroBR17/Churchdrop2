import React from 'react';
import { Download, Trash2, CheckSquare, Square, X, Copy, Tag } from 'lucide-react';
import { MediaItem } from '../types';

interface BatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onBulkCopyLinks: () => void;
  downloadBusy?: boolean;
  downloadStatus?: string;
  downloadNotice?: string;
  downloadUnavailable?: boolean;
  onCancelDownload?: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete,
  onBulkCopyLinks,
  downloadBusy = false, downloadStatus, downloadNotice, downloadUnavailable = false, onCancelDownload
}) => {
  if (selectedCount === 0) return null;

  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="fixed bottom-24 md:bottom-6 inset-x-4 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-6 duration-200">
      <div className="bg-neutral-900/95 dark:bg-neutral-950/95 text-white border border-neutral-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl">
      {(downloadStatus || downloadNotice) && <p role={downloadNotice ? 'status' : undefined} className="text-xs leading-relaxed text-neutral-300 px-2 pb-3">{downloadStatus || downloadNotice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        
        {/* Count & Toggle */}
        <div className="flex items-center gap-3">
          <button 
            disabled={downloadBusy}
            onClick={isAllSelected ? onClearSelection : onSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            {isAllSelected ? <CheckSquare size={16} className="text-univer-blue" /> : <Square size={16} />}
            <span>{isAllSelected ? 'Todos' : `${selectedCount} sel.`}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            disabled={downloadBusy}
            onClick={onBulkCopyLinks}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5"
            title="Copiar links dos selecionados"
          >
            <Copy size={15} />
            <span className="hidden sm:inline">Copiar Links</span>
          </button>

          <button 
            disabled={downloadBusy || downloadUnavailable}
            onClick={onBulkDownload}
            className="p-2 bg-univer-blue hover:bg-blue-600 text-white rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Baixar selecionados em lote"
          >
            <Download size={15} />
            <span>{downloadBusy ? 'Preparando…' : selectedCount === 1 ? 'Baixar' : 'Baixar ZIP'}</span>
          </button>

          <button 
            disabled={downloadBusy}
            onClick={onBulkDelete}
            className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 border border-rose-500/30"
            title="Excluir arquivos selecionados"
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline">Excluir</span>
          </button>

          <button 
            onClick={downloadBusy ? onCancelDownload : onClearSelection}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors ml-1"
            title={downloadBusy ? 'Cancelar ZIP' : 'Cancelar seleção'}
          >
            <X size={18} />
          </button>
        </div>

      </div>
      </div>
    </div>
  );
};
