import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, X, Music, Volume2, VolumeX, Download } from 'lucide-react';
import { MediaItem } from '../types';

interface AudioPlayerBarProps {
  item: MediaItem | null;
  onClose: () => void;
  onDownload: (url: string) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({ item, onClose, onDownload }) => {
  if (!item || item.type !== 'audio') return null;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsPlaying(true);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [item]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed bottom-24 md:bottom-4 inset-x-4 max-w-lg mx-auto z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-neutral-900/95 dark:bg-neutral-950/95 text-white border border-purple-500/30 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2">
        
        <audio 
          ref={audioRef}
          src={item.downloadUrl || item.url}
          onTimeUpdate={() => {
            if (!audioRef.current) return;
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
          }}
          onEnded={() => setIsPlaying(false)}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 truncate min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
              <Music size={18} />
            </div>
            <div className="truncate">
              <span className="block text-xs font-bold truncate text-white">{item.name}</span>
              <span className="block text-[10px] text-purple-300 font-semibold">{item.eventName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                if (audioRef.current) audioRef.current.muted = !isMuted;
              }}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <button 
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5 fill-white" />}
            </button>

            <button 
              onClick={() => onDownload(item.downloadUrl || item.url)}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              title="Baixar Áudio"
            >
              <Download size={16} />
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-neutral-400">{formatTime(currentTime)}</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={progress || 0}
            onChange={(e) => {
              const pct = parseFloat(e.target.value);
              setProgress(pct);
              if (audioRef.current && duration) {
                audioRef.current.currentTime = (pct / 100) * duration;
              }
            }}
            className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span className="text-[9px] font-mono text-neutral-400">{formatTime(duration)}</span>
        </div>

      </div>
    </div>
  );
};
