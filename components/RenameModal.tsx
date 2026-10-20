import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2 } from 'lucide-react';
import { MediaItem } from '../types';

interface RenameModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onConfirm: (id: string, newName: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  item,
  onClose,
  onConfirm,
  showToast
}) => {
  const [newName, setNewName] = useState(item?.name || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNewName(item?.name || '');
  }, [item]);
  useBodyScrollLock(Boolean(item));
  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('O nome do arquivo não pode ficar em branco.', 'error');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(item.id, newName.trim());
      showToast('Arquivo renomeado com sucesso!', 'success');
      onClose();
    } catch (e) {
      showToast('Erro ao renomear arquivo no Google Drive.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-label="Renomear Arquivo" className="workspace-dialog relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-univer-blue/10 text-univer-blue flex items-center justify-center font-bold">
              <Edit3 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Renomear Arquivo</h2>
              <p className="text-xs text-neutral-500">Altere o nome visível no Google Drive</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Novo Nome do Arquivo:
            </label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 dark:text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-univer-blue outline-none transition-all"
              autoFocus
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading || !newName.trim()}
              className="flex items-center gap-2 bg-univer-blue hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Alteração'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
