import {MediaPlayback} from './MediaPlayback';
import {PdfPreview} from './PdfPreview';
import {useDialogEscape} from '../hooks/useDialogEscape';
import {isTextEntry} from '../services/keyboard';
import {ImagePreview} from './ImagePreview';
import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import React, { useState, useEffect } from 'react';
import { 
  X, Download, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  RotateCw, Maximize2, Copy, Check, FileText, CheckSquare, Square
} from 'lucide-react';
import { MediaItem } from '../types';

interface MediaViewerModalProps {
  item: MediaItem | null;
  isSelected?:boolean;
  selectedCount?:number;
  onToggleSelection?:()=>void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  onDownload: (url: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  item,
  isSelected=false,selectedCount=0,onToggleSelection,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onDownload,
  showToast
}) => {
  // Image Zoom & Rotate Controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copiedText, setCopiedText] = useState(false);
  // Swipe Gestures for Mobile
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  useEffect(() => {
    if (!item) return;
    // Reset state on media item change
    setCopiedText(false);

  }, [item?.id]);
  useEffect(() => {
    if(!item)return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTextEntry(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('audio, video')) return;
      if (item.type === 'image' && zoom > 1) return;
      if (e.key === 'ArrowRight' && hasNext) {e.preventDefault();onNext();}
      if (e.key === 'ArrowLeft' && hasPrev) {e.preventDefault();onPrev();}
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, hasNext, hasPrev, zoom, onClose, onNext, onPrev]);
  useEffect(()=>{setZoom(1);setRotation(0);setTouchStartX(0);setTouchEndX(0);},[item?.id]);
  useBodyScrollLock(Boolean(item));
  useDialogEscape(Boolean(item), onClose);
  if (!item) return null;
  const selectionTarget=item.type==='image'?'esta foto':'este arquivo';

  const handleCopyText = async (content?: string) => {
    if (!content) return;
    try { await navigator.clipboard.writeText(content); }
    catch {showToast("Não foi possível copiar o texto. Tente novamente.", "error");return;}
    setCopiedText(true);
    showToast('Texto copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if(['audio','video','pdf'].includes(item.type)||e.targetTouches.length!==1 || (item.type==='image'&&zoom>1)){setTouchStartX(0);setTouchEndX(0);return;}
    setTouchEndX(0);setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if(['audio','video','pdf'].includes(item.type)||e.targetTouches.length!==1 || (item.type==='image'&&zoom>1)){setTouchStartX(0);setTouchEndX(0);return;}
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX || (item.type==='image'&&zoom>1)) return;
    const diffX = touchStartX - touchEndX;
    if (diffX > 50 && hasNext) onNext();
    if (diffX < -50 && hasPrev) onPrev();
    setTouchStartX(0);
    setTouchEndX(0);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Visualizar ${item.name}`} className="media-viewer fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Top Bar Navigation */}
      <div className="relative shrink-0 z-20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-3 bg-gradient-to-b from-black/80 to-transparent text-white">
        <div className="flex items-center gap-3 min-w-0 basis-full sm:basis-auto sm:flex-1 pr-4">
          <span className="text-xs font-bold uppercase tracking-widest text-univer-gold px-2.5 py-1 bg-white/10 rounded-full border border-white/10 shrink-0">
            {{image:'Imagem',video:'Vídeo',audio:'Áudio',pdf:'PDF',text:'Texto'}[item.type]}
          </span>
          <h2 className="text-sm md:text-base font-bold truncate max-w-md" title={item.name}>
            {item.name}
          </h2>
        </div>

        <div className="flex w-full sm:w-auto flex-wrap justify-end items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          {/* Zoom controls for images */}
          {item.type === 'image' && (
            <>
              <button 
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                className="p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
                title="Reduzir Zoom"
              >
                <ZoomOut size={18} />
              </button>
              <button 
                onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                className="p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
                title="Aumentar Zoom"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={()=>{setZoom(1);setRotation(0);}}
                className="p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
                title="Ajustar imagem à tela"><Maximize2 size={18}/></button>
              <button 
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
                title="Rotacionar"
              >
                <RotateCw size={18} />
              </button>
            </>
          )}

          {/* Download button */}
          <button 
            onClick={() => onDownload(item.downloadUrl || item.url)}
            className="p-2 bg-univer-blue hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-900/50"
            title="Baixar Arquivo"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Baixar</span>
          </button>

          {/* Drive Direct Link if ID exists */}
          {item.id && !item.id.startsWith('temp_') && (
            <button 
              onClick={() => window.open(`https://drive.google.com/file/d/${encodeURIComponent(item.id)}/view`, '_blank', 'noopener,noreferrer')}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-xs font-semibold hidden sm:flex items-center gap-1.5"
              title="Abrir no Google Drive"
            >
              <ExternalLink size={16} />
              <span className="hidden md:inline">Abrir Drive</span>
            </button>
          )}

          <button 
            onClick={onClose}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-colors sm:ml-2"
            title="Fechar (ESC)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Viewer Canvas */}
      <div 
        className="w-full flex-1 min-h-0 flex items-center justify-center p-2 sm:p-3 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* IMAGE VIEWER */}
        {item.type === 'image' && (
          <ImagePreview key={item.id} src={item.url} name={item.name} zoom={zoom} rotation={rotation}/>
        )}

        {(item.type === 'video' || item.type === 'audio') && (
          <div className="w-full max-w-4xl max-h-full overflow-y-auto">
            <MediaPlayback key={item.id} item={item} onDownload={onDownload}/>
          </div>
        )}

        {/* TEXT / ANOTAÇÃO VIEWER */}
        {item.type === 'text' && (
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 bg-neutral-800/80 border-b border-neutral-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <FileText size={18} />
                <span>Conteúdo de Texto</span>
              </div>
              <button 
                onClick={() => handleCopyText(item.textContent)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {copiedText ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed select-text">
              {item.textContent || 'Carregando conteúdo do arquivo...'}
            </div>
          </div>
        )}

        {item.type === 'pdf' && <PdfPreview key={item.id} item={item} onDownload={onDownload}/>}


      </div>
      {(hasPrev||hasNext||onToggleSelection)&&<nav aria-label="Navegação entre arquivos" className="flex shrink-0 items-center justify-between gap-2 bg-black px-3 py-2 text-white">
        <button type="button" onClick={onPrev} disabled={!hasPrev} aria-label="Anterior" title="Anterior (Seta Esquerda)" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs disabled:opacity-30"><ChevronLeft size={22}/><span className="hidden sm:inline">Anterior</span></button>
        {onToggleSelection&&<div className="flex min-w-0 flex-col items-center gap-1">
          <button type="button" onClick={onToggleSelection} aria-pressed={isSelected} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isSelected?'bg-blue-600 text-white':'bg-white text-neutral-900'}`}>
            {isSelected?<CheckSquare size={18}/>:<Square size={18}/>}<span>{isSelected?'Desmarcar':'Selecionar'} {selectionTarget}</span>
          </button>
          <span role="status" className="text-[10px] text-neutral-400">{selectedCount} na seleção</span>
        </div>}
        <button type="button" onClick={onNext} disabled={!hasNext} aria-label="Próximo" title="Próximo (Seta Direita)" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs disabled:opacity-30"><span className="hidden sm:inline">Próximo</span><ChevronRight size={22}/></button>
      </nav>}
    </div>
  );
};
