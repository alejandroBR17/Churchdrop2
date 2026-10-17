import React from 'react';
import { 
  Home, Video, ImageIcon, FileText, Keyboard, DownloadCloud, Sun, Moon, 
  Search, Sparkles, Music, HardDrive, ShieldCheck, Zap
} from 'lucide-react';
import { MediaType } from '../types';

interface DesktopSidebarProps {
  activeFilter: MediaType | 'all';
  setActiveFilter: (filter: MediaType | 'all') => void;
  setSearchTerm: (term: string) => void;
  setShowShortcuts: (show: boolean) => void;
  setShowHolyricsModal: (show: boolean) => void;
  setShowStatsModal: (show: boolean) => void;
  deferredPrompt: any;
  handleInstallClick: () => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  GOLD_TEXT_CLASS: string;
  counts: {
    all: number;
    video: number;
    image: number;
    text: number;
    pdf: number;
    audio: number;
  };
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeFilter, 
  setActiveFilter, 
  setSearchTerm, 
  setShowShortcuts, 
  setShowHolyricsModal,
  setShowStatsModal, 
  deferredPrompt, 
  handleInstallClick, 
  toggleTheme, 
  isDarkMode, 
  GOLD_TEXT_CLASS,
  counts
}) => {
  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200/80 dark:border-neutral-800/80 flex-col shadow-xl select-none">
      
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
        <img 
          src="https://imgur.com/XaqB3Ri.png" 
          alt="Logo Univer Mídia" 
          className="w-12 h-12 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
        />
        <div className="flex flex-col">
          <h1 className="text-base font-extrabold text-neutral-900 dark:text-white tracking-tight uppercase leading-none">
            Univer
          </h1>
          <span className={`text-[10px] font-bold tracking-[0.22em] uppercase ${GOLD_TEXT_CLASS}`}>
            Mídia
          </span>
          <span className="text-[10px] text-neutral-400 font-semibold mt-0.5 flex items-center gap-1">
            <ShieldCheck size={11} className="text-emerald-500" />
            Transmissão Técnica
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto custom-scrollbar">
        
        <button 
          onClick={() => { setActiveFilter('all'); setSearchTerm(''); }} 
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeFilter === 'all' 
              ? 'bg-univer-blue text-white shadow-md shadow-blue-500/20' 
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Home size={18} />
            <span>Biblioteca Geral</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            activeFilter === 'all' 
              ? 'bg-white/20 text-white' 
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
          }`}>
            {counts.all}
          </span>
        </button>

        <div className="pt-5 pb-2 px-3 text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
          <Search size={11} /> Categoria de Arquivo
        </div>
        
        <button 
          onClick={() => setActiveFilter('video')} 
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
            activeFilter === 'video' 
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 font-bold' 
              : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Video size={16} className={GOLD_TEXT_CLASS} />
            <span>Vídeos do Culto</span>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">{counts.video}</span>
        </button>
        
        <button 
          onClick={() => setActiveFilter('image')} 
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
            activeFilter === 'image' 
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 font-bold' 
              : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ImageIcon size={16} className="text-blue-500 dark:text-blue-400" />
            <span>Imagens & Fotos</span>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">{counts.image}</span>
        </button>

        <button 
          onClick={() => setActiveFilter('pdf')} 
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
            activeFilter === 'pdf' 
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 font-bold' 
              : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText size={16} className="text-rose-500" />
            <span>Documentos (PDFs)</span>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">{counts.pdf}</span>
        </button>

        <button 
          onClick={() => setActiveFilter('audio')} 
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
            activeFilter === 'audio' 
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 font-bold' 
              : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Music size={16} className="text-purple-500" />
            <span>Músicas & Áudios</span>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">{counts.audio}</span>
        </button>

        <button 
          onClick={() => setActiveFilter('text')} 
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
            activeFilter === 'text' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 font-bold' 
              : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText size={16} className="text-emerald-500 dark:text-emerald-400" />
            <span>Anotações / Recados</span>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">{counts.text}</span>
        </button>

        <div className="pt-6 pb-2 px-3 text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
          <Zap size={11} /> Ferramentas Técnicas
        </div>

        <button 
          onClick={() => setShowHolyricsModal(true)} 
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
        >
          <Sparkles size={16} className="text-purple-500" />
          <span>Formatador Holyrics</span>
        </button>

        <button 
          onClick={() => setShowStatsModal(true)} 
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <HardDrive size={16} className="text-sky-500" />
          <span>Servidor & Diagnóstico</span>
        </button>

        <button 
          onClick={() => setShowShortcuts(true)} 
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Keyboard size={16} className="text-neutral-400" />
          <span>Atalhos de Teclado</span>
        </button>

        {deferredPrompt && (
          <button 
            onClick={handleInstallClick} 
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border border-amber-200 dark:border-amber-700/40 mt-3 ${GOLD_TEXT_CLASS}`}
          >
            <DownloadCloud size={16} />
            <span>Instalar Aplicativo (PWA)</span>
          </button>
        )}
      </nav>

      {/* Footer controls */}
      <div className="p-3.5 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50">
        <div className="flex items-center justify-between">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 flex items-center gap-2 text-xs font-semibold"
            title="Alternar Tema Escuro/Claro"
          >
            {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">DRIVE ATIVO</span>
          </div>
        </div>
      </div>

    </aside>
  );
};
