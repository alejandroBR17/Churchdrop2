import React, {useEffect, useState} from 'react';
import {MediaItem} from '../types';

export function PdfPreview({item, onDownload}: {item: MediaItem; onDownload: (url: string) => void}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'slow' | 'error'>('loading');
  const source = item.downloadUrl || item.url;
  useEffect(() => {
    setStatus('loading');
    const timer = window.setTimeout(() => setStatus(previous => previous === 'loading' ? 'slow' : previous), 12000);
    return () => window.clearTimeout(timer);
  }, [source, attempt]);
  const buttonClass = 'inline-flex min-h-11 items-center rounded-xl border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800';
  return <section aria-label="Prévia do PDF" className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
    <div className="shrink-0 space-y-2 p-3">
      <p role="status" className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
        {status === 'loading' ? 'Carregando prévia do PDF…' : status === 'slow' ? 'A prévia está demorando. Você pode abrir o PDF em outra aba ou baixar.' : status === 'error' ? 'Não foi possível carregar a prévia. Abra o PDF ou tente novamente.' : 'Se a prévia ficar em branco, use Abrir PDF.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={`https://drive.google.com/file/d/${encodeURIComponent(item.id)}/view`} target="_blank" rel="noopener noreferrer" className={buttonClass}>Abrir PDF</a>
        <button type="button" onClick={() => onDownload(source)} className={buttonClass}>Baixar PDF</button>
        <button type="button" onClick={() => setAttempt(value => value + 1)} className={buttonClass}>Recarregar prévia</button>
      </div>
    </div>
    <iframe key={`${source}:${attempt}`} src={`https://docs.google.com/viewer?url=${encodeURIComponent(source)}&embedded=true`} title={`PDF: ${item.name}`} onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} className="min-h-0 w-full flex-1 border-0 bg-white"/>
  </section>;
}
