import React, {useEffect, useRef, useState} from 'react';
import {MediaItem} from '../types';
import {isInteractiveTarget} from '../services/keyboard';

type Status = 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';
const messages: Record<Status, string> = {
  loading: 'Carregando mídia…', ready: 'Toque em reproduzir para começar.',
  playing: 'Reproduzindo', paused: 'Pausado', buffering: 'Aguardando a conexão…',
  ended: 'Reprodução concluída', error: 'Não foi possível reproduzir aqui. Tente novamente, abra no Drive ou baixe o arquivo.',
};

export function MediaPlayback({item, onDownload}: {item: MediaItem; onDownload: (url: string) => void}) {
  const audio = useRef<HTMLAudioElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  const source = item.downloadUrl || item.url;
  const kind = item.type === 'video' ? 'video' : 'audio';

  useEffect(() => {
    const media = kind === 'video' ? video.current : audio.current;
    if (!media) return;
    let disposed = false;
    setStatus('loading');
    const pauseOthers = () => {
      document.querySelectorAll<HTMLMediaElement>('[data-univer-player]').forEach(other => {
        if (other !== media) other.pause();
      });
    };
    const play = async () => {
      pauseOthers();
      try { await media.play(); }
      catch (error) {
        if (disposed) return;
        // iOS can require a second user gesture. This is not a file error.
        setStatus(error instanceof DOMException && error.name === 'NotAllowedError' ? 'ready' : media.error ? 'error' : 'ready');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.code !== 'Space' && event.key !== ' ') || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isInteractiveTarget(event.target)) return;
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      const front = dialogs[dialogs.length - 1];
      if (front && !front.contains(media)) return;
      event.preventDefault();
      if (media.paused) void play(); else media.pause();
    };
    media.addEventListener('play', pauseOthers);
    window.addEventListener('keydown', onKeyDown);
    void play();
    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      media.removeEventListener('play', pauseOthers);
      media.pause();
      media.removeAttribute('src');
      media.load();
    };
  }, [source, kind, attempt]);

  const events = {
    onLoadStart: () => setStatus('loading'),
    onCanPlay: () => setStatus(previous => previous === 'loading' || previous === 'buffering' ? 'ready' : previous),
    onPlaying: () => setStatus('playing'),
    onPause: () => setStatus(previous => previous === 'error' || previous === 'ended' ? previous : 'paused'),
    onWaiting: () => setStatus('buffering'),
    onEnded: () => setStatus('ended'),
    onError: () => setStatus('error'),
  };
  const buttonClass = 'min-h-11 rounded-xl border border-neutral-700 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800';
  return <section aria-label={`Reprodutor de ${kind === 'video' ? 'vídeo' : 'áudio'}`} className="w-full min-w-0 max-h-full overflow-y-auto rounded-2xl bg-neutral-900 p-3 text-white">
    {kind === 'video'
      ? <video key={`${source}:${attempt}`} ref={video} src={source} data-univer-player controls playsInline preload="metadata" aria-label={item.name} className="w-full max-h-[55dvh] object-contain bg-black" {...events}/>
      : <audio key={`${source}:${attempt}`} ref={audio} src={source} data-univer-player controls preload="metadata" aria-label={item.name} className="w-full" {...events}/>}
    <p role="status" className="mt-2 text-xs leading-relaxed text-neutral-300">{messages[status]}</p>
    {status === 'error' && <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={buttonClass} onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button>
      {!item.id.startsWith('temp_') && <a className={`${buttonClass} inline-flex items-center`} href={`https://drive.google.com/file/d/${encodeURIComponent(item.id)}/view`} target="_blank" rel="noopener noreferrer">Abrir no Drive</a>}
      <button type="button" className={buttonClass} onClick={() => onDownload(source)}>Baixar arquivo</button>
    </div>}
  </section>;
}
