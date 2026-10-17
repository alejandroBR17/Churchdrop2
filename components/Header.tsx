import React from 'react';
import { 
  Search, Grid, List, RefreshCw, QrCode, HardDrive, Sun, Moon, 
  Upload, Sparkles, Filter, CheckSquare, X
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
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Logo Mobile / Title */}
          <div className="flex items-center gap-3 shrink-0 md:hidden">
            <img 
              src="https://imgur.com/XaqB3Ri.png" 
              alt="Logo" 
              className="w-9 h-9 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase leading-none">
                Univer
              </span>
              <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${GOLD_TEXT_CLASS}`}>
                Mídia
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-xl relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome ou evento... (Pressione /)"
                className="w-full pl-10 pr-9 py-2 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-white rounded-xl text-sm border border-transparent focus:border-univer-blue focus:bg-white dark:focus:bg-neutral-900 outline-none transition-all placeholder:text-neutral-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Multi-selection pill if items selected */}
            {selectedCount > 0 ? (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 animate-in fade-in">
                <span>{selectedCount} selecionado(s)</span>
                <button 
                  onClick={onClearSelection}
                  className="hover:bg-blue-100 dark:hover:bg-blue-900/50 p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                  title="Limpar seleção"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm font-bold' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title="Visualização em Grade"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm font-bold' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title="Visualização em Lista"
              >
                <List size={18} />
              </button>
            </div>

            {/* Sync Refresh */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-neutral-200/60 dark:border-neutral-800/60 ${
                isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              title="Sincronizar Arquivos"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-univer-blue' : ''} />
            </button>

            {/* Holyrics Formatter Quick Button */}
            {onOpenHolyrics && (
              <button
                onClick={onOpenHolyrics}
                className="p-2 rounded-xl text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all border border-purple-200 dark:border-purple-800/60 flex items-center gap-1.5 text-xs font-bold shadow-xs active:scale-95"
                title="Formatador Holyrics / Projeção"
              >
                <Sparkles size={18} />
                <span className="hidden sm:inline">Holyrics</span>
              </button>
            )}

            {/* Quick Share QR Modal */}
            <button
              onClick={onOpenShare}
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-neutral-200/60 dark:border-neutral-800/60 hidden sm:flex items-center gap-1.5 text-xs font-semibold"
              title="Gerar QR Code de Upload para Celular"
            >
              <QrCode size={18} className="text-univer-blue" />
              <span className="hidden md:inline">Enviar via QR</span>
            </button>

            {/* Storage Stats */}
            <button
              onClick={onOpenStats}
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-neutral-200/60 dark:border-neutral-800/60 hidden sm:flex items-center gap-1.5 text-xs font-semibold"
              title="Estatísticas e Saúde do Servidor"
            >
              <HardDrive size={18} className="text-purple-500" />
            </button>

            {/* Theme Switcher Mobile */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-neutral-200/60 dark:border-neutral-800/60 md:hidden"
            >
              {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
            </button>

            {/* Primary Upload CTA */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 bg-univer-blue hover:bg-blue-600 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Enviar Mídia</span>
              <span className="sm:hidden">Enviar</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
