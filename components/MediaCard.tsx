import React, { useState } from 'react';
import { 
  Video, FileText, Music, Image as ImageIcon, Download, Trash2, 
  Edit3, CheckCircle, Eye, Share2, Play, Bookmark, Loader2
} from 'lucide-react';
import { MediaItem } from '../types';

interface MediaCardProps {
  item: MediaItem;
  isSelected: boolean;
  hasSelection: boolean;
  onToggle: (id: string, e?: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onRename: (item: MediaItem) => void;
  onDownload: (url: string) => void;
  onView: (item: MediaItem) => void;
  onShare?: (item: MediaItem) => void;
  onPreserve?: (item: MediaItem) => void;
  isPreserving?: boolean;
  preservationDisabled?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({ 
  item, 
  isSelected, 
  hasSelection, 
  onToggle, 
  onDelete, 
  onRename, 
  onDownload, 
  onView,
  onShare, onPreserve, isPreserving, preservationDisabled
}) => {
  const [imgError, setImgError] = useState(false);
  const [isImgLoading, setIsImgLoading] = useState(true);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-amber-500/90 text-white';
      case 'image': return 'bg-blue-500/90 text-white';
      case 'pdf': return 'bg-rose-500/90 text-white';
      case 'audio': return 'bg-purple-500/90 text-white';
      case 'text': return 'bg-emerald-500/90 text-white';
      default: return 'bg-neutral-600/90 text-white';
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'VÍDEO';
      case 'image': return 'IMAGEM';
      case 'pdf': return 'PDF';
      case 'audio': return 'ÁUDIO';
      case 'text': return 'TEXTO';
      default: return 'ARQUIVO';
    }
  };

  return (
    <div 
      className={`media-card group relative bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 ${
        isSelected 
          ? 'ring-2 ring-univer-blue border-transparent bg-blue-50/40 dark:bg-blue-950/20' 
          : 'border-neutral-200/80 dark:border-neutral-800/80'
      }`}
      onClick={(e) => {
        if (hasSelection) {
          onToggle(item.id, e);
        } else {
          onView(item);
        }
      }}
    >
      {/* Media Preview Box */}
      <div className="aspect-video w-full bg-neutral-950 relative overflow-hidden flex items-center justify-center">
        {(item.type === 'image' || item.type === 'video') && item.url && !imgError ? (
          <>
            {isImgLoading && (
              <div className="absolute inset-0 bg-neutral-800 animate-pulse flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-neutral-600 border-t-neutral-300 rounded-full animate-spin" />
              </div>
            )}
            <img 
              src={item.url} 
              alt={item.name} 
              onLoad={() => setIsImgLoading(false)}
              onError={(e) => {
                e.stopPropagation();
                setImgError(true);
                setIsImgLoading(false);
              }}
              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
                isImgLoading ? 'opacity-0 scale-95' : 'opacity-90 group-hover:opacity-100 scale-100'
              }`} 
              loading="lazy"
            />
            {item.type === 'video' && !isImgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors z-20">
                <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
                  <Play size={20} className="ml-0.5 fill-white" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-neutral-400">
            {item.type === 'video' && <Video size={36} className="text-amber-400 mb-1" />}
            {item.type === 'image' && <ImageIcon size={36} className="text-blue-400 mb-1" />}
            {item.type === 'pdf' && <FileText size={36} className="text-rose-400 mb-1" />}
            {item.type === 'audio' && <Music size={36} className="text-purple-400 mb-1" />}
            {item.type === 'text' && <FileText size={36} className="text-emerald-400 mb-1" />}
            
            {item.type === 'text' && item.textContent && (
              <p className="text-[11px] text-neutral-300 line-clamp-3 font-mono mt-1 px-2 text-left bg-neutral-900/80 p-2 rounded border border-neutral-800">
                {item.textContent}
              </p>
            )}
          </div>
        )}

        {/* Media Type Badge */}
        <span className={`absolute top-2.5 left-2.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-wider shadow-md backdrop-blur-sm ${getBadgeColor(item.type)}`}>
          {getBadgeLabel(item.type)}
        </span>

        {/* Selection Box Corner Button */}
        <div 
          className="absolute top-2.5 right-2.5 z-20"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id, e);
          }}
        >
          {isSelected ? (
            <div className="bg-univer-blue text-white rounded-full p-1 shadow-md scale-110 transition-transform">
              <CheckCircle size={16} />
            </div>
          ) : (
            <div className="bg-black/40 hover:bg-black/70 text-white/90 border border-white/40 rounded-full p-1 shadow-md transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100">
              <div className="w-4 h-4 rounded-full border border-white/80" />
            </div>
          )}
        </div>

        {/* Quick View Button Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
          <span className="bg-white/90 dark:bg-neutral-900/90 text-neutral-900 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
            <Eye size={14} /> Visualizar
          </span>
        </div>
      </div>

      {/* Card Info Details */}
      <div className="p-4 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate" title={item.name}>
            {item.name}
          </h3>
          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="font-semibold text-neutral-400">{item.size || 'Drive'}</span>
            <span>{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {onPreserve && <button type="button"
          aria-pressed={Boolean(item.preserved)}
          aria-label={`${item.preserved ? 'Remover preservação de' : 'Preservar'} ${item.name}`}
          disabled={preservationDisabled}
          title="Fica fora da revisão por idade. Não é backup e não impede exclusão manual."
          onClick={event=>{event.stopPropagation(); onPreserve(item);}}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium disabled:opacity-50 ${item.preserved ? 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
          {isPreserving ? <Loader2 size={14} className="shrink-0 animate-spin"/> : <Bookmark size={14} className="shrink-0" fill={item.preserved ? 'currentColor' : 'none'}/>}
          {isPreserving ? 'Salvando…' : item.preserved ? 'Preservado da revisão por idade' : 'Preservar este arquivo'}
        </button>}

        {/* Action Toolbar */}
        <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/80 pt-2.5 mt-2.5">
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onRename(item); }}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              title="Renomear"
            >
              <Edit3 size={14} />
            </button>
            {onShare && (
              <button 
                onClick={(e) => { e.stopPropagation(); onShare(item); }}
                className="p-1.5 text-neutral-400 hover:text-univer-blue hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                title="Compartilhar Link"
              >
                <Share2 size={14} />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(item.downloadUrl || item.url); }}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-100 hover:bg-univer-blue dark:bg-neutral-800 dark:hover:bg-univer-blue text-neutral-700 hover:text-white dark:text-neutral-300 dark:hover:text-white text-[11px] font-bold rounded-lg transition-colors"
            title="Baixar Arquivo"
          >
            <Download size={13} />
            <span>Baixar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
