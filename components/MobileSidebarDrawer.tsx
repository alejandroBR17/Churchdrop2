import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import React from 'react';
import { 
  X, Sparkles, HardDrive, Keyboard, DownloadCloud, Sun, Moon, 
  Home, Video, ImageIcon, FileText, Music, ShieldCheck, Zap 
} from 'lucide-react';
import { MediaType } from '../types';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilter: MediaType | 'all';
  setActiveFilter: (filter: MediaType | 'all') => void;
  onOpenHolyrics: () => void;
  onOpenStats: () => void;
  onOpenShortcuts: () => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  GOLD_TEXT_CLASS: string;
  deferredPrompt: any;
  handleInstallClick: () => void;
}

export const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeFilter,
  setActiveFilter,
  onOpenHolyrics,
  onOpenStats,
  onOpenShortcuts,
  toggleTheme,
  isDarkMode,
  GOLD_TEXT_CLASS,
  deferredPrompt,
  handleInstallClick,
}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div role="dialog" aria-modal="true" aria-label="Menu principal" className="mobile-drawer relative w-full max-w-sm h-full bg-white dark:bg-neutral-900 shadow-2xl flex flex-col justify-between overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div>
          <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2.5">
              <img 
                src="https://imgur.com/XaqB3Ri.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase leading-none">
                  Univer Mídia
                </span>
                <span className={`text-[9px] font-bold tracking-widest uppercase ${GOLD_TEXT_CLASS}`}>
                  Menu Principal
                </span>
              </div>
            </div>
            <button aria-label="Fechar menu"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Special Holyrics Banner CTA */}
          <div className="p-4">
            <button
              onClick={() => { onClose(); onOpenHolyrics(); }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="block text-xs font-black uppercase tracking-wider text-purple-200">Preparar texto</span>
                <span className="block text-sm font-extrabold leading-tight">Formatador Holyrics</span>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-2 space-y-1">
            <div className="px-3 text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">
              Filtros
            </div>

            <button 
              onClick={() => { setActiveFilter('all'); onClose(); }} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                activeFilter === 'all' 
                  ? 'bg-univer-blue text-white font-bold' 
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <Home size={16} />
              <span>Todos os Arquivos</span>
            </button>

            <button 
              onClick={() => { setActiveFilter('video'); onClose(); }} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                activeFilter === 'video' 
                  ? 'bg-amber-500 text-white font-bold' 
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <Video size={16} className={GOLD_TEXT_CLASS} />
              <span>Vídeos</span>
            </button>

            <button 
              onClick={() => { setActiveFilter('image'); onClose(); }} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                activeFilter === 'image' 
                  ? 'bg-blue-500 text-white font-bold' 
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <ImageIcon size={16} />
              <span>Fotos</span>
            </button>

            <button 
              onClick={() => { setActiveFilter('pdf'); onClose(); }} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                activeFilter === 'pdf' 
                  ? 'bg-rose-500 text-white font-bold' 
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <FileText size={16} />
              <span>Documentos / PDFs</span>
            </button>

            <div className="pt-4 px-3 text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">
              Ferramentas & Sistema
            </div>

            <button 
              onClick={() => { onClose(); onOpenStats(); }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <HardDrive size={16} className="text-sky-500" />
              <span>Status do Servidor</span>
            </button>

            <button 
              onClick={() => { onClose(); onOpenShortcuts(); }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <Keyboard size={16} className="text-emerald-500" />
              <span>Atalhos do Teclado</span>
            </button>

            <button 
              onClick={() => { toggleTheme(); }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <div className="flex items-center gap-3">
                {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                <span>Tema {isDarkMode ? 'Escuro' : 'Claro'}</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-neutral-400">Alternar</span>
            </button>

            {deferredPrompt && (
              <button 
                onClick={() => { onClose(); handleInstallClick(); }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <DownloadCloud size={16} />
                <span>Instalar Aplicativo PWA</span>
              </button>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <p className="text-[11px] font-medium text-neutral-400">
            Univer Mídia © Transmissão Técnica
          </p>
        </div>

      </div>
    </div>
  );
};
