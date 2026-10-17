import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = true,
  isLoading = false,
  onClose,
  onConfirm
}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-label={title} className="workspace-dialog relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden flex flex-col p-6 text-center">
        
        <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
          isDanger 
            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' 
            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
        }`}>
          <AlertTriangle size={24} />
        </div>

        <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">{title}</h3>
        <p className="text-xs text-neutral-500 leading-relaxed mb-6">{message}</p>

        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex-1"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 flex-1 shadow-md ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' 
                : 'bg-univer-blue hover:bg-blue-600 shadow-blue-500/30'
            }`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};
