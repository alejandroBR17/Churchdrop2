import React from 'react';
import {X, Music, Download} from 'lucide-react';
import {MediaItem} from '../types';
import {MediaPlayback} from './MediaPlayback';

interface AudioPlayerBarProps {
  item: MediaItem | null;
  onClose: () => void;
  onDownload: (url: string) => void;
  raised?: boolean;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({item, onClose, onDownload, raised = false}) => {
  if (!item || item.type !== 'audio') return null;
  return <div className={`fixed ${raised ? 'bottom-48 md:bottom-28' : 'bottom-24 md:bottom-4'} inset-x-3 max-w-lg mx-auto z-50`}>
    <div className="rounded-2xl border border-purple-500/30 bg-white dark:bg-neutral-950 p-3 text-neutral-900 dark:text-white shadow-2xl">
      <div className="flex items-center gap-2">
        <Music size={22} className="shrink-0 text-purple-400"/>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{item.eventName}</p></div>
        <button type="button" aria-label="Baixar áudio" onClick={() => onDownload(item.downloadUrl || item.url)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"><Download size={18}/></button>
        <button type="button" aria-label="Fechar reprodutor" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={20}/></button>
      </div>
      <MediaPlayback item={item} onDownload={onDownload}/>
    </div>
  </div>;
};
