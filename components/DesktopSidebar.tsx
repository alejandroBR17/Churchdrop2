import React from 'react';
import { 
  Home, Video, ImageIcon, FileText, Keyboard, DownloadCloud, Sun, Moon, 
  Sparkles, Music, HardDrive, ShieldCheck
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
  const categories = [
    {key: 'all', label: 'Biblioteca Geral', icon: Home, count: counts.all},
    {key: 'video', label: 'Vídeos', icon: Video, count: counts.video},
    {key: 'image', label: 'Imagens & Fotos', icon: ImageIcon, count: counts.image},
    {key: 'audio', label: 'Músicas & Áudios', icon: Music, count: counts.audio},
    {key: 'pdf', label: 'Documentos (PDFs)', icon: FileText, count: counts.pdf},
    {key: 'text', label: 'Anotações / Recados', icon: FileText, count: counts.text},
  ] as const;
  return (
    <aside className="workspace-sidebar hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col">
      <div className="px-6 pt-8 pb-7 flex items-center gap-3">
        <img src="https://imgur.com/XaqB3Ri.png" alt="Logo Univer Mídia" className="w-11 h-11 object-contain"/>
        <div><p className="text-lg font-bold tracking-tight">Univer<span className="text-blue-400"> Mídia</span></p><p className="mt-1 text-[11px] text-slate-400">Da sua mão para a projeção.</p></div>
      </div>
      <nav aria-label="Biblioteca e ferramentas" className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 space-y-1">
        <p className="eyebrow px-3 pb-3">Biblioteca</p>
        {categories.map(({key,label,icon:Icon,count})=><button key={key} onClick={()=>{setActiveFilter(key);if(key==='all')setSearchTerm('');}} aria-current={activeFilter===key ? 'page' : undefined} className="sidebar-link"><span className="flex items-center gap-3"><Icon size={18}/>{label}</span><span className="sidebar-count">{count}</span></button>)}
        <p className="eyebrow px-3 pt-8 pb-3">Ferramentas</p>
        <button onClick={()=>setShowHolyricsModal(true)} className="sidebar-link"><span className="flex items-center gap-3"><Sparkles size={18}/>Formatador Holyrics</span></button>
        <button onClick={()=>setShowStatsModal(true)} className="sidebar-link"><span className="flex items-center gap-3"><HardDrive size={18}/>Servidor & Diagnóstico</span></button>
        <button onClick={()=>setShowShortcuts(true)} className="sidebar-link"><span className="flex items-center gap-3"><Keyboard size={18}/>Atalhos de Teclado</span></button>
        {deferredPrompt && <button onClick={handleInstallClick} className="sidebar-link"><span className="flex items-center gap-3"><DownloadCloud size={18}/>Instalar aplicativo</span></button>}
      </nav>
      <div className="p-4 border-t border-white/10"><button onClick={toggleTheme} className="sidebar-link"><span className="flex items-center gap-3">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>} {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span></button><p className="mt-4 px-3 text-[10px] text-slate-500 flex items-center gap-2"><ShieldCheck size={13}/>Gerenciamento com acesso protegido</p></div>
    </aside>
  );
};
