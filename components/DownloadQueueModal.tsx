import React, {useEffect, useRef, useState} from 'react';
import {Download, X, ExternalLink, Pause, Files} from 'lucide-react';
import type {MediaItem} from '../types';
import {requestNativeDownload, browserDownloadUrl} from '../services/nativeDownload';
import {useBodyScrollLock} from '../hooks/useBodyScrollLock';

export function DownloadQueueModal({files,onClose}:{files:MediaItem[];onClose:()=>void}) {
  const [requested,setRequested] = useState<Set<string>>(new Set());
  const [errors,setErrors] = useState<Record<string,string>>({});
  const [running,setRunning] = useState(false);
  const epoch = useRef(0);
  useBodyScrollLock(true);
  useEffect(()=>()=>{epoch.current++;},[]);
  const request = (file:MediaItem) => {
    try {
      requestNativeDownload(file.downloadUrl,file.name);
      setRequested(previous=>new Set(previous).add(file.id));
      setErrors(previous=>{const next={...previous};delete next[file.id];return next;});
    } catch(error) {setErrors(previous=>({...previous,[file.id]:error instanceof Error ? error.message : 'Não foi possível solicitar o arquivo.'}));}
  };
  const requestAll = async () => {
    if(running)return;
    const run = ++epoch.current;setRunning(true);
    const remaining=files.filter(file=>!requested.has(file.id));
    for(let i=0;i<remaining.length;i++) {
      if(epoch.current!==run)break;
      request(remaining[i]);
      // Space browser requests, not simulated download progress/completion.
      if(i<remaining.length-1)await new Promise(resolve=>setTimeout(resolve,1200));
    }
    if(epoch.current===run)setRunning(false);
  };
  const pause = () => {epoch.current++;setRunning(false);};
  const next = files.find(file=>!requested.has(file.id));
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-label="Baixar arquivos separados" className="workspace-dialog max-w-lg w-full flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
      <header className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0"><div><p className="eyebrow mb-1">Sem compactar</p><h2 className="text-lg font-bold flex items-center gap-2"><Files size={20} className="text-blue-500"/>Baixar arquivos separados</h2></div><button className="icon-button" aria-label="Fechar downloads" onClick={()=>{pause();onClose();}}><X size={18}/></button></header>
      <div className="dialog-scroll min-h-0 overflow-y-auto p-5 space-y-4">
        <p className="text-xs leading-relaxed text-neutral-500">Cada arquivo vai para os downloads do navegador. Se aparecer um pedido de permissão para vários downloads, permita para continuar; você também pode baixar um por vez.</p>
        <p role="status" className="text-xs font-semibold">{requested.size} de {files.length} solicitações enviadas ao navegador</p>
        <ul className="space-y-2">{files.map(file=><li key={file.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
          <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold break-words">{file.name}</p><p className="text-[11px] mt-1 text-neutral-500">{requested.has(file.id)?'Solicitado · confira os downloads do navegador':file.size || 'Pronto para solicitar'}</p></div><button disabled={running} className="icon-button" aria-label={`Baixar ${file.name}`} onClick={()=>request(file)}><Download size={17}/></button></div>
          {errors[file.id] && <p role="alert" className="text-xs text-rose-500">{errors[file.id]}</p>}
          {requested.has(file.id) && <a href={browserDownloadUrl(file.downloadUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">Não iniciou? Verificar no Google<ExternalLink size={12}/></a>}
        </li>)}</ul>
        <p className="text-[11px] leading-relaxed text-neutral-500">O app não consegue confirmar se o arquivo foi salvo. Arquivos grandes podem exigir uma confirmação do Google; nesse caso, use o link de verificação do arquivo.</p>
      </div>
      <footer className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap justify-end gap-2 shrink-0">
        {running ? <button className="secondary-button" onClick={pause}><Pause size={16}/>Pausar solicitações</button> : <><button className="secondary-button" disabled={!next} onClick={()=>{if(next)request(next);}}>Baixar próximo</button><button className="primary-button disabled:opacity-40" disabled={!next} onClick={requestAll}><Download size={16}/>Baixar todos separados</button></>}
      </footer>
    </section>
  </div>;
}
