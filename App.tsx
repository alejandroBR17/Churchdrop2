import {isTextEntry} from './services/keyboard';
import {rangeSelection} from './services/rangeSelection';
import {getDownloadRequests,subscribeDownloadRequests,clearDownloadRequests} from './services/downloadRequests';
import {useLibrarySync} from './hooks/useLibrarySync';
import React, { useState, useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import {requestNativeDownload, clearNativeDownloads} from './services/nativeDownload';
import {DownloadQueueModal} from './components/DownloadQueueModal';
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
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileSidebarDrawer } from './components/MobileSidebarDrawer';

import { MediaItem, MediaType, ToastState, ViewMode } from './types';
import {libraryDays, uploadDay} from './services/libraryDays';
import { 
  fetchFilesFromScript, deleteFileFromScript, renameFileInScript, 
  getCachedFiles, groupItemsByEvent, fetchTextContent, setFilePreservation
} from './services/churchService';

const GOLD_TEXT_CLASS = "text-amber-600 dark:text-univer-gold";

export default function App() {
  const requestedDownloads=useSyncExternalStore(subscribeDownloadRequests,getDownloadRequests);
  // Theme & Layout State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try { const theme = localStorage.getItem('theme'); return theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches); }
    catch {return window.matchMedia('(prefers-color-scheme: dark)').matches;}
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<MediaType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data & Selection State
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedDay, setSelectedDay] = useState('recent');
  const days = useMemo(()=>libraryDays(items),[items]);
  const resolvedDay = selectedDay === 'recent' ? days[0]?.key : selectedDay === 'all' ? undefined : selectedDay;
  const dayItems = useMemo(()=>resolvedDay ? items.filter(item=>uploadDay(item.date)===resolvedDay) : items,[items,resolvedDay]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectionAnchor=useRef<string|null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedItems = useMemo(() => items.filter(item => selectedIds.includes(item.id)), [items, selectedIds]);
  const [listError, setListError] = useState('');
  const listRequest = useRef<AbortController | null>(null);
  const preservationRequest = useRef<AbortController | null>(null);
  const [preservingId, setPreservingId] = useState<string | null>(null);
  useEffect(() => () => preservationRequest.current?.abort(), []);
  const [loadingStage, setLoadingStage] = useState<'idle' | 'stage1_cache' | 'stage2_server'>('idle');
  const [visibleItemLimit, setVisibleItemLimit] = useState<number>(12);

  // Modals & Active Viewers
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  const [activeAudioItem, setActiveAudioItem] = useState<MediaItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [downloadQueue, setDownloadQueue] = useState<{files:MediaItem[];requestedIds:string[]} | null>(null);
  useEffect(()=>()=>clearNativeDownloads(),[]);
  const [showHolyricsModal, setShowHolyricsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
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

  // Sync Theme with DOM and the browser toolbar (including installed apps).
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDarkMode ? '#0b1424' : '#f5f7fb');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      try {localStorage.setItem('theme', 'dark');} catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {localStorage.setItem('theme', 'light');} catch {}
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const showToast = (message: string, type: 'success' | 'error' | 'info', duration = 3500) => {
    setToast({ show: true, message, type, duration });
  };

  // Reset visible limit on filter/search change (progressive chunking)
  useEffect(() => {
    setVisibleItemLimit(12);selectionAnchor.current=null;
  }, [activeFilter, searchTerm, resolvedDay]);

  const mutationCount = useRef(0);
  const syncContext = useRef({selectedDay,resolvedDay,selectedIds,blocked:false});
  syncContext.current = {selectedDay,resolvedDay,selectedIds,blocked:Boolean(isLoading||showUploadModal||itemToRename||itemToDelete||isBulkDeleteConfirm||isDeleting||viewerItem||downloadQueue||showStatsModal||showHolyricsModal)};
  const cancelLibraryRead = () => {
    listRequest.current?.abort();listRequest.current=null;
    setIsRefreshing(false);setIsLoading(false);setLoadingStage('idle');
  };
  // Automatic reads preserve the current view; explicit refresh keeps its feedback.
  const loadFiles = async (showLoadingSpinner = true, automatic = false):Promise<boolean|undefined> => {
    if (preservationRequest.current || mutationCount.current) {if(!automatic)showToast('Aguarde a alteração terminar antes de atualizar.', 'info'); return;}
    if(automatic && listRequest.current)return;
    listRequest.current?.abort();
    const request = new AbortController();
    listRequest.current = request;
    if (showLoadingSpinner) setIsLoading(true);
    setIsRefreshing(true);
    if(!automatic){setListError('');setLoadingStage('stage1_cache');}
    const cached = getCachedFiles();
    try {
      // Step 1: Rapid Cache Hydration
      if (!automatic && cached.length > 0) {
        setItems(cached);
        if (showLoadingSpinner) setIsLoading(false);
      }

      // Step 2: Background Server Sync
      if(!automatic)setLoadingStage('stage2_server');
      const freshFiles = await fetchFilesFromScript(request.signal);
      if (listRequest.current !== request || request.signal.aborted) return;
      const ids = new Set(freshFiles.map(file=>file.id));
      const view = syncContext.current;
      // A new publication day must not hide photos the user has already selected.
      if(view.selectedDay==='recent' && view.resolvedDay && view.selectedIds.some(id=>ids.has(id)) && libraryDays(freshFiles)[0]?.key!==view.resolvedDay)setSelectedDay(view.resolvedDay);
      setItems(previous=>JSON.stringify(previous)===JSON.stringify(freshFiles)?previous:freshFiles);
      setSelectedIds(previous=>{const next=previous.filter(id=>ids.has(id));return next.length===previous.length?previous:next;});
      setListError('');
      if (!showLoadingSpinner && !automatic) showToast('Lista atualizada.', 'success', 2500);
      return true;
    } catch {
      if (listRequest.current !== request || request.signal.aborted) return;
      setListError(automatic ? 'Não foi possível atualizar automaticamente. A lista anterior foi mantida; vamos tentar novamente.' : cached.length > 0
        ? 'Não foi possível atualizar. Você está vendo a última lista desta sessão.'
        : 'Não foi possível carregar os arquivos. Verifique sua conexão e tente novamente.');
      return false;
    } finally {
      if (listRequest.current === request && !request.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
        setLoadingStage('idle');
        listRequest.current=null;
      }
    }
  };

  useEffect(() => {
    loadFiles();
    return () => listRequest.current?.abort();
  }, []);

  useLibrarySync(()=>loadFiles(false,true),()=>syncContext.current.blocked||Boolean(listRequest.current||preservationRequest.current||mutationCount.current));

  // Leave typing and open dialogs in control of their own keyboard shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTextEntry(e.target) || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && !e.altKey) {
        e.preventDefault();
        selectionAnchor.current = null;
        setSelectedIds(filteredItems.map(i => i.id));
        showToast(`${filteredItems.length} itens selecionados`, 'info');
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        document.getElementById('library-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, searchTerm, activeFilter, resolvedDay]);

  // Search and type counters use the same selected-day scope.
  const searchItems = useMemo(() => {
    const query=searchTerm.trim().toLocaleLowerCase('pt-BR');
    return dayItems.filter(item=>!query || item.name.toLocaleLowerCase('pt-BR').includes(query) || item.eventName?.toLocaleLowerCase('pt-BR').includes(query));
  },[dayItems,searchTerm]);
  const filteredItems = useMemo(()=>searchItems.filter(item=>activeFilter==='all'||item.type===activeFilter),[searchItems,activeFilter]);
  useEffect(()=>{
    const visible = new Set(filteredItems.map(item=>item.id));
    setSelectedIds(previous=>previous.filter(id=>visible.has(id)));
  },[filteredItems]);

  // Counts by type
  const counts = useMemo(() => {
    return {
      all: searchItems.length,
      video: searchItems.filter(i => i.type === 'video').length,
      image: searchItems.filter(i => i.type === 'image').length,
      pdf: searchItems.filter(i => i.type === 'pdf').length,
      audio: searchItems.filter(i => i.type === 'audio').length,
      text: searchItems.filter(i => i.type === 'text').length,
    };
  }, [searchItems]);

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

  const visibleSelectionIds=useMemo(()=>sortedEventNames.flatMap(name=>collapsedGroups[name]?[]:groupedItems[name].slice(0,visibleItemLimit).map(item=>item.id)),[sortedEventNames,groupedItems,collapsedGroups,visibleItemLimit]);

  // Shift follows displayed order and applies the clicked item state to the range.
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if(e?.shiftKey)e.preventDefault();
    if(!visibleSelectionIds.includes(id))return;
    const anchor=selectionAnchor.current;
    const shift=Boolean(e?.shiftKey);
    if(!shift||anchor===null||!visibleSelectionIds.includes(anchor))selectionAnchor.current=id;
    setSelectedIds(previous=>rangeSelection(previous,visibleSelectionIds,anchor,id,shift));
  };

  const handleSelectAll = () => {
    selectionAnchor.current=null;
    setSelectedIds(filteredItems.map(i => i.id));
  };

  const handleClearSelection = () => {
    selectionAnchor.current=null;
    setSelectedIds([]);
  };

  // Native download: do not open a Drive tab or load whole video files in JS.
  const handleDownload = (url: string) => {
    try {
      const file = items.find(item=>item.downloadUrl===url);
      requestNativeDownload(url,file?.name);
      showToast('Download solicitado. Confira os downloads do navegador.', 'info');
    } catch(error) {showToast(error instanceof Error ? error.message : 'Não foi possível solicitar o download.', 'error');}
  };
  const handleSeparateDownloads = () => {
    if(!selectedItems.length)return;
    if(selectedItems.length===1)handleDownload(selectedItems[0].downloadUrl);
    else {
      const first=selectedItems[0];
      try {
        // Preserve the user gesture for the first browser-native download.
        requestNativeDownload(first.downloadUrl,first.name);
        setDownloadQueue({files:[...selectedItems],requestedIds:[first.id]});
      } catch(error) {showToast(error instanceof Error?error.message:'Não foi possível iniciar os downloads.','error');}
    }
  };

  // Bulk Copy Links
  const handleBulkCopyLinks = async () => {
    const selected = items.filter(i => selectedIds.includes(i.id));
    const links = selected.map(i => `${i.name}: ${i.downloadUrl || i.url}`).join('\n');
    try {await navigator.clipboard.writeText(links); showToast(`${selected.length} links copiados!`, 'success');}
    catch {showToast('Não foi possível copiar os links. Tente novamente.', 'error');}
  };

  // Delete File Handler
  const handleConfirmDelete = async () => {
    mutationCount.current++;cancelLibraryRead();
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
      mutationCount.current--;
      setIsDeleting(false);
      setItemToDelete(null);
      setIsBulkDeleteConfirm(false);
    }
  };

  // Rename File Handler
  const handlePreservation = async (item: MediaItem) => {
    if (preservationRequest.current || isRefreshing) return;
    const controller = new AbortController(); preservationRequest.current = controller;
    setPreservingId(item.id);
    const preserved = !item.preserved;
    try {
      await setFilePreservation(item.id, preserved, controller.signal);
      if (controller.signal.aborted) return;
      setItems(previous => previous.map(file => file.id === item.id ? {...file, preserved} : file));
      showToast(preserved ? 'Arquivo fora da revisão por idade. A exclusão manual continua disponível.' : 'Arquivo incluído novamente na revisão por idade.', 'success');
    } catch {
      if (!controller.signal.aborted) showToast('Não foi possível salvar. Atualize a biblioteca e tente novamente.', 'error');
    } finally {
      if (preservationRequest.current === controller) preservationRequest.current = null;
      if (!controller.signal.aborted) setPreservingId(null);
    }
  };

  const handleConfirmRename = async (id: string, newName: string) => {
    mutationCount.current++;cancelLibraryRead();
    try {
      await renameFileInScript(id, newName);
      setItems(prev => prev.map(i => i.id === id ? { ...i, name: newName } : i));
    } finally {mutationCount.current--;}
  };

  // Media Viewer Navigation
  const currentViewerIndex = viewerItem ? filteredItems.findIndex(i => i.id === viewerItem.id) : -1;
  const hasNextViewer = currentViewerIndex !== -1 && currentViewerIndex < filteredItems.length - 1;
  const hasPrevViewer = currentViewerIndex > 0;

  const handleViewerSelection = () => {
    if(!viewerItem||!filteredItems.some(file=>file.id===viewerItem.id))return;
    selectionAnchor.current=viewerItem.id;
    const group=groupedItems[viewerItem.eventName||'Geral']||[];
    const position=group.findIndex(file=>file.id===viewerItem.id);
    if(!selectedIds.includes(viewerItem.id))setVisibleItemLimit(previous=>Math.max(previous,position+1));
    setSelectedIds(previous=>previous.includes(viewerItem.id)?previous.filter(id=>id!==viewerItem.id):[...previous,viewerItem.id]);
  };

  const handleNextViewer = () => {
    if (hasNextViewer) setViewerItem(filteredItems[currentViewerIndex + 1]);
  };

  const handlePrevViewer = () => {
    if (hasPrevViewer) setViewerItem(filteredItems[currentViewerIndex - 1]);
  };

  // Open Media or Play Audio
  const handleViewMedia = async (item: MediaItem) => {
    if (item.type === 'audio') {
      setActiveAudioItem(item);
    } else if (item.type === 'text') {
      try { const textContent = await fetchTextContent(item.id); setViewerItem({...item, textContent}); }
      catch {showToast('Não foi possível abrir o texto. Tente novamente.', 'error');}
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
    <div className="app-shell min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased transition-colors duration-200 select-none">
      
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
      <div className={`flex-1 md:pl-64 flex flex-col ${activeAudioItem ? 'pb-[32rem] md:pb-96' : selectedIds.length ? 'pb-48 md:pb-32' : 'pb-24 md:pb-12'}`}>
        
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
                  ? 'Preparando a biblioteca…'
                  : 'Consultando arquivos no Drive…'}
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider uppercase bg-white/20 px-2.5 py-0.5 rounded-full font-extrabold">
              Passo {loadingStage === 'stage1_cache' ? '1/2' : '2/2'}
            </span>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
          
          <section className="library-intro mb-4 sm:mb-7 flex flex-wrap items-end justify-between gap-5">
            <div><p className="eyebrow mb-2 hidden sm:block">Organize. Compartilhe. Projete.</p><h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Sua biblioteca<span className="text-blue-500">.</span></h1><p className="hidden sm:block mt-3 text-sm text-neutral-500 dark:text-neutral-400 max-w-md leading-relaxed">Os materiais da igreja, prontos para encontrar e levar à projeção.</p></div>
            <div className="library-summary flex gap-6" role="group" aria-label="Resumo dos resultados"><div><strong>{filteredItems.length}</strong><span>{filteredItems.length===1?'arquivo':'arquivos'}</span></div><div><strong>{sortedEventNames.length}</strong><span>{sortedEventNames.length===1?'evento':'eventos'}</span></div></div>
          </section>
          <section aria-label="Arquivos por dia" className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
            <label className="min-w-0 flex-1 text-xs font-semibold">Dia de envio
              <select aria-label="Dia de envio" value={selectedDay} onChange={event=>{setSelectedDay(event.target.value);setSelectedIds([]);}} className="mt-2 block w-full min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm">
                <option value="recent">{days[0] ? `Mais recente · ${days[0].label}` : 'Dia mais recente'}</option>
                {days.filter(day=>day.key!==days[0]?.key || day.key===selectedDay).map(day=><option key={day.key} value={day.key}>{day.label} · {day.count} arquivo(s)</option>)}
                <option value="all">Todos os dias · biblioteca inteira</option>
              </select>
            </label>
            <button type="button" disabled={!filteredItems.length} onClick={handleSelectAll} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white disabled:opacity-40">{resolvedDay ? 'Selecionar arquivos deste dia' : 'Selecionar resultados'}</button>
            <div className="w-full space-y-2">
              <p role="status" className="text-xs leading-relaxed text-neutral-500">Mostrando {filteredItems.length} de {items.length} arquivos nos filtros atuais. {resolvedDay ? `Dia ${resolvedDay.split('-').reverse().join('/')}.` : 'Todos os dias.'}</p>
              {items.length>0 && (resolvedDay || activeFilter!=='all' || searchTerm.trim()) && <button type="button" onClick={()=>{selectionAnchor.current=null;setSelectedDay('all');setActiveFilter('all');setSearchTerm('');setSelectedIds([]);setCollapsedGroups({});}} className="secondary-button w-full sm:w-auto disabled:opacity-40">Mostrar todos os arquivos ({items.length})</button>}
              {requestedDownloads.size>0 && <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-neutral-500"><span>Marcações de download nesta aba</span><button type="button" disabled={Boolean(downloadQueue)} onClick={clearDownloadRequests} aria-label="Limpar marcações de download" className="min-h-11 rounded-xl px-3 font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 disabled:opacity-40">Limpar marcações</button></div>}
            </div>
          </section>
          {/* Category Filter Pills (Mobile Scrollable) */}
          <div className="category-tabs flex items-center gap-2 overflow-x-auto pb-3 mb-6 md:hidden custom-scrollbar">
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

          {listError && <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="min-w-0 flex-1">{listError}</p>
            <button type="button" disabled={isRefreshing} onClick={() => loadFiles(false)} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-current px-3 py-2 font-semibold disabled:opacity-50"><RefreshCw size={16}/>Tentar novamente</button>
          </div>}

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
            <div className="library-empty flex flex-col items-center justify-center p-8 sm:p-12 text-center my-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
                <Search size={32} />
              </div>
              <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                {listError && items.length === 0 ? 'Biblioteca indisponível' : 'Nenhum arquivo encontrado'}
              </h3>
              <p className="text-xs text-neutral-400 max-w-xs mb-6">
                {listError && items.length === 0
                  ? 'Use Tentar novamente para consultar os arquivos no servidor.'
                  : searchTerm
                  ? `Nenhum resultado para "${searchTerm}". Tente buscar outro termo.`
                  : 'A biblioteca de mídias está vazia. Comece enviando novos arquivos.'}
              </p>
              {!listError && <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-univer-blue hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                <Plus size={16} />
                <span>Enviar Primeira Mídia</span>
              </button>}
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
                      className="event-heading flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors select-none"
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
                            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 animate-in fade-in duration-200"
                            : "space-y-2 animate-in fade-in duration-200"
                        }>
                          {visibleGroupList.map(item => (
                            <MediaCard
                              key={item.id}
                              item={item}
                              isSelected={selectedIds.includes(item.id)}
                              downloadRequested={requestedDownloads.has(item.id)}
                              hasSelection={selectedIds.length > 0}
                              onToggle={handleToggleSelect}
                              onDelete={(id) => {
                                setItemToDelete(id);
                                setIsBulkDeleteConfirm(false);
                              }}
                              onRename={(item) => setItemToRename(item)}
                              onPreserve={handlePreservation}
                              isPreserving={preservingId === item.id}
                              preservationDisabled={Boolean(preservingId) || isRefreshing}
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

      {downloadQueue && <DownloadQueueModal files={downloadQueue.files} initialRequestedIds={downloadQueue.requestedIds} autoStart onClose={()=>setDownloadQueue(null)}/>}
      {/* Floating Batch Action Toolbar */}
      <BatchActionBar 
        selectedCount={selectedIds.length}
        totalCount={filteredItems.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDownload={handleSeparateDownloads}
        onBulkDelete={() => setIsBulkDeleteConfirm(true)}
        onBulkCopyLinks={handleBulkCopyLinks}
      />

      {/* Bottom Audio Player Bar */}
      <AudioPlayerBar 
        item={activeAudioItem}
        raised={selectedIds.length > 0}
        onClose={() => setActiveAudioItem(null)}
        onDownload={handleDownload}
      />

      {/* Media Viewer Modal */}
      <MediaViewerModal 
        item={viewerItem}
        isSelected={Boolean(viewerItem&&selectedIds.includes(viewerItem.id))}
        selectedCount={selectedIds.length}
        onToggleSelection={handleViewerSelection}
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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenHolyrics={() => setShowHolyricsModal(true)}
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
