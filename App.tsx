import React, { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  Plus, Grid, List, Search, RefreshCw, Loader2, Sparkles, 
  Trash2, Edit3, Download, Eye, FileText, Video, Music, 
  Image as ImageIcon, CheckCircle, ChevronDown, ChevronUp, Folder
} from 'lucide-react';

import { Toast } from './components/Toast';
import { Header } from './components/Header';
import { DesktopSidebar } from './components/DesktopSidebar';
import { MediaCard } from './components/MediaCard';
import { MediaViewerModal } from './components/MediaViewerModal';
import { UploadModal } from './components/UploadModal';
import { HolyricsFormatterModal } from './components/HolyricsFormatterModal';
import { BatchActionBar } from './components/BatchActionBar';
import { QuickShareModal } from './components/QuickShareModal';
import { StorageStatsModal } from './components/StorageStatsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { RenameModal } from './components/RenameModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { AddMenu } from './components/AddMenu';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileSidebarDrawer } from './components/MobileSidebarDrawer';

import { MediaItem, MediaType, ToastState, ViewMode } from './types';
import { MOCK_MEDIA } from './constants';
import { 
  fetchFilesFromScript, deleteFileFromScript, renameFileInScript, 
  getCachedFiles, groupItemsByEvent 
} from './services/churchService';

const GOLD_TEXT_CLASS = "text-amber-600 dark:text-univer-gold";

export default function App() {
  // Theme & Layout State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<MediaType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data & Selection State
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'idle' | 'stage1_cache' | 'stage2_server'>('idle');
  const [visibleItemLimit, setVisibleItemLimit] = useState<number>(12);

  // Modals & Active Viewers
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  const [activeAudioItem, setActiveAudioItem] = useState<MediaItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHolyricsModal, setShowHolyricsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Rename & Delete Confirm Modals
  const [itemToRename, setItemToRename] = useState<MediaItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Collapsed Groups in Event Accordion
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Toast System
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // OS Detection for Mobile Bottom Sheets
  const [os, setOs] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    if (/android/i.test(userAgent)) setOs('android');
    else if (/iPad|iPhone|iPod/.test(userAgent)) setOs('ios');

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Sync Theme with DOM
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const showToast = (message: string, type: 'success' | 'error' | 'info', duration = 3500) => {
    setToast({ show: true, message, type, duration });
  };

  // Reset visible limit on filter/search change (progressive chunking)
  useEffect(() => {
    setVisibleItemLimit(12);
  }, [activeFilter, searchTerm]);

  // Fetch Files with Step 1/2 Loading Architecture
  const loadFiles = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setIsRefreshing(true);
    setLoadingStage('stage1_cache');

    try {
      // Step 1: Rapid Cache Hydration
      const cached = getCachedFiles();
      if (cached.length > 0) {
        setItems(cached);
        if (showLoadingSpinner) setIsLoading(false);
      }

      // Step 2: Background Server Sync
      setLoadingStage('stage2_server');
      const freshFiles = await fetchFilesFromScript();
      if (freshFiles.length > 0) {
        setItems(freshFiles);
        showToast('Sincronização com o servidor concluída com sucesso!', 'success', 2500);
      } else if (cached.length === 0) {
        // Fallback mock data if server has 0 files or first setup
        setItems(MOCK_MEDIA);
      }
    } catch (e) {
      console.error('Erro ao buscar mídias:', e);
      showToast('Exibindo arquivos cacheados do armazenamento local.', 'info');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLoadingStage('idle');
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
          e.preventDefault();
          setSelectedIds(filteredItems.map(i => i.id));
          showToast(`${filteredItems.length} itens selecionados`, 'info');
        }
      }
      if (e.key === '/') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
          e.preventDefault();
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, searchTerm, activeFilter]);

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
      const matchesSearch = !searchTerm.trim() || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.eventName && item.eventName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [items, activeFilter, searchTerm]);

  // Counts by type
  const counts = useMemo(() => {
    return {
      all: items.length,
      video: items.filter(i => i.type === 'video').length,
      image: items.filter(i => i.type === 'image').length,
      pdf: items.filter(i => i.type === 'pdf').length,
      audio: items.filter(i => i.type === 'audio').length,
      text: items.filter(i => i.type === 'text').length,
    };
  }, [items]);

  // Grouping by Service/Event Name
  const groupedItems = useMemo(() => {
    return groupItemsByEvent(filteredItems);
  }, [filteredItems]);

  const sortedEventNames = useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => {
      const dateA = new Date(groupedItems[a][0].date).getTime();
      const dateB = new Date(groupedItems[b][0].date).getTime();
      return dateB - dateA;
    });
  }, [groupedItems]);

  // Selection Handlers
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredItems.map(i => i.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Download File Handler
  const handleDownload = (url: string) => {
    if (!url) {
      showToast('Link de download não disponível', 'error');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Iniciando download...', 'info');
  };

  // Bulk Download as ZIP
  const handleBulkDownload = async () => {
    const selected = items.filter(i => selectedIds.includes(i.id));
    if (selected.length === 0) return;

    if (selected.length === 1) {
      handleDownload(selected[0].downloadUrl || selected[0].url);
      return;
    }

    showToast(`Gerando arquivo ZIP de ${selected.length} itens...`, 'info');
    const zip = new JSZip();

    let count = 0;
    for (const item of selected) {
      try {
        const downloadUrl = item.downloadUrl || item.url;
        if (downloadUrl) {
          const res = await fetch(downloadUrl);
          const blob = await res.blob();
          zip.file(item.name, blob);
          count++;
        }
      } catch (e) {
        console.warn(`Não foi possível baixar ${item.name} diretamente para o ZIP:`, e);
      }
    }

    if (count > 0) {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `UniverMidia_Pacote_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      showToast('Pacote ZIP gerado e pronto!', 'success');
    } else {
      showToast('Erro ao agrupar arquivos em ZIP.', 'error');
    }
  };

  // Bulk Copy Links
  const handleBulkCopyLinks = () => {
    const selected = items.filter(i => selectedIds.includes(i.id));
    const links = selected.map(i => `${i.name}: ${i.downloadUrl || i.url}`).join('\n');
    navigator.clipboard.writeText(links);
    showToast(`${selected.length} links copiados!`, 'success');
  };

  // Delete File Handler
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (isBulkDeleteConfirm) {
        for (const id of selectedIds) {
          await deleteFileFromScript(id);
        }
        setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
        setSelectedIds([]);
        showToast('Arquivos excluídos com sucesso!', 'success');
      } else if (itemToDelete) {
        await deleteFileFromScript(itemToDelete);
        setItems(prev => prev.filter(i => i.id !== itemToDelete));
        showToast('Arquivo excluído com sucesso!', 'success');
      }
    } catch (e) {
      showToast('Erro ao excluir arquivo(s).', 'error');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
      setIsBulkDeleteConfirm(false);
    }
  };

  // Rename File Handler
  const handleConfirmRename = async (id: string, newName: string) => {
    await renameFileInScript(id, newName);
    setItems(prev => prev.map(i => i.id === id ? { ...i, name: newName } : i));
  };

  // Media Viewer Navigation
  const currentViewerIndex = viewerItem ? filteredItems.findIndex(i => i.id === viewerItem.id) : -1;
  const hasNextViewer = currentViewerIndex !== -1 && currentViewerIndex < filteredItems.length - 1;
  const hasPrevViewer = currentViewerIndex > 0;

  const handleNextViewer = () => {
    if (hasNextViewer) setViewerItem(filteredItems[currentViewerIndex + 1]);
  };

  const handlePrevViewer = () => {
    if (hasPrevViewer) setViewerItem(filteredItems[currentViewerIndex - 1]);
  };

  // Open Media or Play Audio
  const handleViewMedia = (item: MediaItem) => {
    if (item.type === 'audio') {
      setActiveAudioItem(item);
    } else {
      setViewerItem(item);
    }
  };

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          showToast('Aplicativo instalado!', 'success');
        }
        setDeferredPrompt(null);
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased transition-colors duration-200 select-none">
      
      {/* Toast Notification */}
      {toast.show && (
        <Toast 
          show={toast.show}
          message={toast.message} 
          type={toast.type} 
          duration={toast.duration} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}

      {/* Desktop Sidebar */}
      <DesktopSidebar 
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        setSearchTerm={setSearchTerm}
        setShowShortcuts={setShowShortcutsModal}
        setShowHolyricsModal={setShowHolyricsModal}
        setShowStatsModal={setShowStatsModal}
        deferredPrompt={deferredPrompt}
        handleInstallClick={handleInstallClick}
        toggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
        GOLD_TEXT_CLASS={GOLD_TEXT_CLASS}
        counts={counts}
      />

      {/* Main Container Area */}
      <div className="flex-1 md:pl-72 flex flex-col pb-24 md:pb-12">
        
        {/* Sticky Header */}
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onRefresh={() => loadFiles(false)}
          isRefreshing={isRefreshing}
          onOpenUpload={() => setShowUploadModal(true)}
          onOpenShare={() => setShowShareModal(true)}
          onOpenStats={() => setShowStatsModal(true)}
          onOpenHolyrics={() => setShowHolyricsModal(true)}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          selectedCount={selectedIds.length}
          totalCount={filteredItems.length}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          GOLD_TEXT_CLASS={GOLD_TEXT_CLASS}
        />

        {/* 2-Step Loading Status Banner */}
        {loadingStage !== 'idle' && (
          <div className="bg-gradient-to-r from-purple-600 to-univer-blue text-white text-xs px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm z-20">
            <div className="flex items-center gap-2.5 font-bold">
              <Loader2 size={15} className="animate-spin" />
              <span>
                {loadingStage === 'stage1_cache' 
                  ? '⚡ Etapa 1/2: Carregando mídias salvas no cache local...' 
                  : '🔄 Etapa 2/2: Sincronizando novas mídias do servidor...'}
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider uppercase bg-white/20 px-2.5 py-0.5 rounded-full font-extrabold">
              Passo {loadingStage === 'stage1_cache' ? '1/2' : '2/2'}
            </span>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Category Filter Pills (Mobile Scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 md:hidden custom-scrollbar">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                activeFilter === 'all' 
                  ? 'bg-univer-blue text-white shadow-sm' 
                  : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Todos ({counts.all})
            </button>
            <button 
              onClick={() => setActiveFilter('video')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                activeFilter === 'video' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Vídeos ({counts.video})
            </button>
            <button 
              onClick={() => setActiveFilter('image')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                activeFilter === 'image' 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Fotos ({counts.image})
            </button>
            <button 
              onClick={() => setActiveFilter('pdf')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                activeFilter === 'pdf' 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              PDFs ({counts.pdf})
            </button>
            <button 
              onClick={() => setActiveFilter('audio')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                activeFilter === 'audio' 
                  ? 'bg-purple-500 text-white shadow-sm' 
                  : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Áudios ({counts.audio})
            </button>
            <button 
              onClick={() => setActiveFilter('text')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                activeFilter === 'text' 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Textos ({counts.text})
            </button>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 animate-pulse space-y-3">
                  <div className="aspect-video w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center p-12 text-center my-12 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
                <Search size={32} />
              </div>
              <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                Nenhum arquivo encontrado
              </h3>
              <p className="text-xs text-neutral-400 max-w-xs mb-6">
                {searchTerm 
                  ? `Nenhum resultado para "${searchTerm}". Tente buscar outro termo.`
                  : 'A biblioteca de mídias está vazia. Comece enviando novos arquivos.'}
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-univer-blue hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                <Plus size={16} />
                <span>Enviar Primeira Mídia</span>
              </button>
            </div>
          ) : (
            /* Media Cards Accordions grouped by Event */
            <div className="space-y-8">
              {sortedEventNames.map(eventName => {
                const groupList = groupedItems[eventName];
                const isCollapsed = collapsedGroups[eventName];
                const visibleGroupList = groupList.slice(0, visibleItemLimit);
                const hasMoreItems = groupList.length > visibleItemLimit;

                return (
                  <section key={eventName} className="space-y-3">
                    
                    {/* Event Group Banner Header */}
                    <div 
                      onClick={() => toggleGroupCollapse(eventName)}
                      className="flex items-center justify-between p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-univer-blue/10 text-univer-blue flex items-center justify-center font-bold">
                          <Folder size={18} />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                            {eventName}
                          </h2>
                          <span className="text-[11px] text-neutral-400 font-semibold">
                            {groupList.length} arquivo(s) disponível(is)
                          </span>
                        </div>
                      </div>

                      <button className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg">
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                    </div>

                    {/* Group Grid or List */}
                    {!isCollapsed && (
                      <>
                        <div className={
                          viewMode === 'grid' 
                            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-200"
                            : "space-y-2 animate-in fade-in duration-200"
                        }>
                          {visibleGroupList.map((item, idx) => (
                            <MediaCard
                              key={`${item.id || 'item'}-${idx}`}
                              item={item}
                              isSelected={selectedIds.includes(item.id)}
                              hasSelection={selectedIds.length > 0}
                              onToggle={handleToggleSelect}
                              onDelete={(id) => {
                                setItemToDelete(id);
                                setIsBulkDeleteConfirm(false);
                              }}
                              onRename={(item) => setItemToRename(item)}
                              onDownload={(url) => handleDownload(url)}
                              onView={handleViewMedia}
                              onShare={(item) => {
                                navigator.clipboard.writeText(item.downloadUrl || item.url);
                                showToast('Link do arquivo copiado!', 'success');
                              }}
                            />
                          ))}
                        </div>

                        {/* Progressive Batch Loading Button (Passo 2/2) */}
                        {hasMoreItems && (
                          <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                            <button
                              onClick={() => setVisibleItemLimit(prev => prev + 12)}
                              className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all border border-purple-200 dark:border-purple-800/60 flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
                            >
                              <Sparkles size={14} />
                              <span>Mais 12 mídias (+{Math.min(12, groupList.length - visibleItemLimit)})</span>
                            </button>
                            <button
                              onClick={() => setVisibleItemLimit(groupList.length)}
                              className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all border border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                            >
                              <span>Exibir todas ({groupList.length})</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}

                  </section>
                );
              })}
            </div>
          )}

        </main>

      </div>

      {/* Floating Batch Action Toolbar */}
      <BatchActionBar 
        selectedCount={selectedIds.length}
        totalCount={filteredItems.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={() => setIsBulkDeleteConfirm(true)}
        onBulkCopyLinks={handleBulkCopyLinks}
      />

      {/* Bottom Audio Player Bar */}
      <AudioPlayerBar 
        item={activeAudioItem}
        onClose={() => setActiveAudioItem(null)}
        onDownload={handleDownload}
      />

      {/* Media Viewer Modal */}
      <MediaViewerModal 
        item={viewerItem}
        onClose={() => setViewerItem(null)}
        onNext={handleNextViewer}
        onPrev={handlePrevViewer}
        hasNext={hasNextViewer}
        hasPrev={hasPrevViewer}
        onDownload={handleDownload}
        showToast={showToast}
      />

      {/* Upload Modal */}
      <UploadModal 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => loadFiles(false)}
        showToast={showToast}
      />

      {/* Holyrics Formatter Modal */}
      <HolyricsFormatterModal 
        isOpen={showHolyricsModal}
        onClose={() => setShowHolyricsModal(false)}
        showToast={showToast}
      />

      {/* Quick Share QR Modal */}
      <QuickShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        showToast={showToast}
      />

      {/* Storage Diagnostics Modal */}
      <StorageStatsModal 
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        totalCount={items.length}
        counts={counts}
        showToast={showToast}
        onRefresh={() => loadFiles(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal 
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Rename File Modal */}
      <RenameModal 
        item={itemToRename}
        onClose={() => setItemToRename(null)}
        onConfirm={handleConfirmRename}
        showToast={showToast}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmModal 
        isOpen={Boolean(itemToDelete) || isBulkDeleteConfirm}
        title={isBulkDeleteConfirm ? `Excluir ${selectedIds.length} arquivo(s)?` : 'Excluir arquivo?'}
        message="Esta ação enviará o arquivo para a lixeira do Google Drive e removerá o acesso rápido."
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        isDanger={true}
        isLoading={isDeleting}
        onClose={() => {
          setItemToDelete(null);
          setIsBulkDeleteConfirm(false);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Mobile Add Sheet Menu */}
      <AddMenu 
        isOpen={showAddMenu}
        onClose={() => setShowAddMenu(false)}
        onUploadClick={() => setShowUploadModal(true)}
        onTextClick={() => setShowHolyricsModal(true)}
        os={os}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        setShowAddMenu={setShowAddMenu}
        setSidebarOpen={setShowMobileSidebar}
        sidebarOpen={showMobileSidebar}
        GOLD_TEXT_CLASS={GOLD_TEXT_CLASS}
        os={os}
      />

      {/* Mobile Sidebar Drawer */}
      <MobileSidebarDrawer 
        isOpen={showMobileSidebar}
        onClose={() => setShowMobileSidebar(false)}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onOpenHolyrics={() => setShowHolyricsModal(true)}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        toggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
        GOLD_TEXT_CLASS={GOLD_TEXT_CLASS}
        deferredPrompt={deferredPrompt}
        handleInstallClick={handleInstallClick}
      />

    </div>
  );
}
