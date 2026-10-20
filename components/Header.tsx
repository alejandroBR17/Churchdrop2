import React from 'react';
import { 
  Search, Grid, List, RefreshCw, QrCode, HardDrive, Sun, Moon, 
  Upload, Sparkles, X
} from 'lucide-react';
import { ViewMode, MediaType } from '../types';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeFilter: MediaType | 'all';
  setActiveFilter: (filter: MediaType | 'all') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenUpload: () => void;
  onOpenShare: () => void;
  onOpenStats: () => void;
  onOpenHolyrics?: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  GOLD_TEXT_CLASS: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
  activeFilter,
  setActiveFilter,
  onRefresh,
  isRefreshing,
  onOpenUpload,
  onOpenShare,
  onOpenStats,
  onOpenHolyrics,
  isDarkMode,
  toggleTheme,
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  GOLD_TEXT_CLASS,
}) => {
  return (
    <header className="workspace-header sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="https://imgur.com/XaqB3Ri.png" alt="Logo Univer Mídia" className="w-10 h-10 object-contain shrink-0 md:hidden"/>
            <div className="min-w-0"><p className="eyebrow hidden md:block">Seu espaço de trabalho</p><p className="text-base font-bold tracking-tight truncate">Univer Mídia</p></div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onRefresh} disabled={isRefreshing} className="icon-button" title="Sincronizar Arquivos"><RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''}/></button>
            <button onClick={toggleTheme} className="icon-button md:hidden" title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}>{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <button onClick={onOpenShare} className="icon-button hidden sm:flex" title="Gerar QR Code de Upload para Celular"><QrCode size={18}/></button>
            <button onClick={onOpenUpload} className="primary-button"><Upload size={17}/><span className="sm:hidden">Enviar</span><span className="hidden sm:inline">Enviar Mídia</span></button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18}/>
            <input id="library-search" aria-label="Pesquisar arquivos" type="search" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar arquivo ou evento" className="workspace-search w-full pl-11 pr-10 py-3 text-sm"/>
            {searchTerm && <button onClick={()=>setSearchTerm('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"><X size={17}/></button>}
          </div>
          <div className="view-switch hidden sm:flex">
            <button onClick={()=>setViewMode('grid')} aria-pressed={viewMode==='grid'} title="Visualização em Grade"><Grid size={18}/></button>
            <button onClick={()=>setViewMode('list')} aria-pressed={viewMode==='list'} title="Visualização em Lista"><List size={18}/></button>
          </div>
          <button onClick={onOpenStats} className="icon-button hidden lg:flex" title="Estatísticas e Saúde do Servidor"><HardDrive size={18}/></button>
          {onOpenHolyrics && <button onClick={onOpenHolyrics} className="secondary-button hidden xl:flex" title="Formatador Holyrics / Projeção"><Sparkles size={17}/>Holyrics</button>}
        </div>
        {selectedCount>0 && <div className="flex items-center justify-between gap-2 text-xs font-medium text-blue-600 dark:text-blue-300"><span>{selectedCount} de {totalCount} selecionados</span><button onClick={onClearSelection} className="underline underline-offset-4">Limpar seleção</button></div>}
      </div>
    </header>
  );
};
