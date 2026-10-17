import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '/', desc: 'Focar no campo de pesquisa' },
    { key: 'ESC', desc: 'Fechar visualizador de mídia ou modais' },
    { key: 'Seta Direita (→)', desc: 'Próxima mídia no visualizador' },
    { key: 'Seta Esquerda (←)', desc: 'Mídia anterior no visualizador' },
    { key: 'Ctrl / Cmd + A', desc: 'Selecionar todos os arquivos visíveis' },
    { key: 'Espaço', desc: 'Tocar ou pausar vídeo e áudio' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-200/60 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Atalhos de Teclado</h2>
              <p className="text-xs text-neutral-500">Agilidade durante cultos e reuniões</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {shortcuts.map((sc, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="text-neutral-600 dark:text-neutral-300 font-medium">{sc.desc}</span>
              <kbd className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-[11px] font-mono font-bold text-neutral-800 dark:text-neutral-200 shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-univer-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
