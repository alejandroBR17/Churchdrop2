import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  RotateCw, Maximize2, Minimize2, Copy, Check, FileText, Music, Video as VideoIcon,
  Play, Pause, Volume2, VolumeX, Sparkles, Share2
} from 'lucide-react';
import { MediaItem } from '../types';

interface MediaViewerModalProps {
  item: MediaItem | null;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Audio Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Swipe Gestures for Mobile
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  useEffect(() => {
    if (!item) return;
    // Reset state on media item change
    setZoom(1);
    setRotation(0);
    setVideoError(false);
    setIsPlaying(false);
    setAudioProgress(0);
    setCopiedText(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, hasNext, hasPrev]);
  useBodyScrollLock(Boolean(item));
  if (!item) return null;

  const handleCopyText = (content?: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedText(true);
    showToast('Texto copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const diffX = touchStartX - touchEndX;
    if (diffX > 50 && hasNext) onNext();
    if (diffX < -50 && hasPrev) onPrev();
    setTouchStartX(0);
    setTouchEndX(0);
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Visualizar ${item.name}`} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Top Bar Navigation */}
      <div className="absolute top-0 inset-x-0 z-20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-4 bg-gradient-to-b from-black/80 to-transparent text-white">
        <div className="flex items-center gap-3 min-w-0 basis-full sm:basis-auto sm:flex-1 pr-4">
          <span className="text-xs font-bold uppercase tracking-widest text-univer-gold px-2.5 py-1 bg-white/10 rounded-full border border-white/10 shrink-0">
            {item.type}
          </span>
          <h2 className="text-sm md:text-base font-bold truncate max-w-md" title={item.name}>
            {item.name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto">
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
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-colors ml-2"
            title="Fechar (ESC)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Viewer Canvas */}
      <div 
        className="w-full h-full flex items-center justify-center p-4 pt-28 sm:pt-16 pb-16 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* IMAGE VIEWER */}
        {item.type === 'image' && (
          <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto p-4">
            <img 
              src={item.url} 
              alt={item.name}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-w-full max-h-[80vh] object-contain select-none drop-shadow-2xl rounded-lg"
            />
          </div>
        )}

        {/* VIDEO VIEWER */}
        {item.type === 'video' && (
          <div className="w-full max-w-4xl max-h-[80vh] flex flex-col items-center justify-center bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-800">
            {videoError ? (
              <div className="p-8 text-center max-w-md">
                <VideoIcon size={48} className="text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Reprodução Direta Indisponível</h3>
                <p className="text-xs text-neutral-400 mb-6">
                  Este vídeo requer download direto ou abertura no Google Drive.
                </p>
                <div className="flex justify-center gap-3">
                  {!item.id.startsWith('temp_') && (
                    <button 
                      onClick={() => window.open(`https://drive.google.com/file/d/${encodeURIComponent(item.id)}/view`, '_blank', 'noopener,noreferrer')}
                      className="px-4 py-2 bg-white text-black font-bold rounded-xl text-xs hover:bg-neutral-200 transition-colors"
                    >
                      Abrir no Google Drive
                    </button>
                  )}
                  <button 
                    onClick={() => onDownload(item.downloadUrl || item.url)}
                    className="px-4 py-2 bg-univer-blue text-white font-bold rounded-xl text-xs hover:bg-blue-600 transition-colors"
                  >
                    Baixar Vídeo
                  </button>
                </div>
              </div>
            ) : (
              <video 
                controls 
                playsInline
                ref={(el) => {
                  if (el) {
                    el.play().catch(() => {
                      // Autoplay failed or was blocked by browser policy
                    });
                  }
                }}
                onError={(e) => {
                  e.stopPropagation();
                  setVideoError(true);
                }}
                src={item.downloadUrl || item.url} 
                className="w-full max-h-[75vh] object-contain"
              >
                Seu navegador não suporta a reprodução deste vídeo.
              </video>
            )}
          </div>
        )}

        {/* AUDIO VIEWER */}
        {item.type === 'audio' && (
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-purple-950/60 border-2 border-purple-500/40 flex items-center justify-center text-purple-400 mb-6 shadow-xl animate-pulse">
              <Music size={44} />
            </div>

            <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{item.name}</h3>
            <span className="text-xs text-neutral-400 font-semibold mb-6">{item.eventName}</span>

            <audio 
              ref={audioRef} 
              src={item.downloadUrl || item.url} 
              onTimeUpdate={() => {
                if (!audioRef.current) return;
                setCurrentTime(audioRef.current.currentTime);
                setDuration(audioRef.current.duration || 0);
                setAudioProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Audio Progress Bar */}
            <div className="w-full mb-6">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={audioProgress || 0}
                onChange={(e) => {
                  const pct = parseFloat(e.target.value);
                  setAudioProgress(pct);
                  if (audioRef.current && duration) {
                    audioRef.current.currentTime = (pct / 100) * duration;
                  }
                }}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[11px] font-mono text-neutral-400 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Play/Pause & Volume controls */}
            <div className="flex items-center gap-6">
              <button 
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (audioRef.current) audioRef.current.muted = !isMuted;
                }}
                className="p-3 text-neutral-400 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <button 
                onClick={toggleAudioPlay}
                className="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/40 transition-transform active:scale-95"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1 fill-white" />}
              </button>

              <button 
                onClick={() => onDownload(item.downloadUrl || item.url)}
                className="p-3 text-neutral-400 hover:text-white transition-colors"
                title="Baixar Áudio"
              >
                <Download size={20} />
              </button>
            </div>
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

        {/* PDF VIEWER */}
        {item.type === 'pdf' && (
          <div className="w-full max-w-4xl h-[80vh] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <iframe 
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(item.downloadUrl || item.url)}&embedded=true`}
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          </div>
        )}

        {/* Navigation Arrows */}
        {hasPrev && (
          <button 
            onClick={onPrev}
            className="absolute left-4 p-3 bg-black/60 hover:bg-univer-blue text-white rounded-full transition-all backdrop-blur-md shadow-xl active:scale-95 z-20"
            title="Anterior (Seta Esquerda)"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {hasNext && (
          <button 
            onClick={onNext}
            className="absolute right-4 p-3 bg-black/60 hover:bg-univer-blue text-white rounded-full transition-all backdrop-blur-md shadow-xl active:scale-95 z-20"
            title="Próximo (Seta Direita)"
          >
            <ChevronRight size={28} />
          </button>
        )}

      </div>

    </div>
  );
};
