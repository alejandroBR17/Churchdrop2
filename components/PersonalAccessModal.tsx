import React, {useEffect, useRef, useState} from 'react';
import {Check, Copy, Link2, Loader2, X} from 'lucide-react';
import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import {appApi} from '../services/appApi';

type LinkState = {active:boolean;expiresAt?:number;url?:string;revoked?:boolean};

/** The raw link lives only in this mounted dialog and the user's chosen clipboard. */
export function PersonalAccessModal({onClose}:{onClose:()=>void}) {
  const [info,setInfo] = useState<LinkState>();
  const [code,setCode] = useState('');
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [copied,setCopied] = useState(false);
  const [confirm,setConfirm] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const control = useRef<AbortController>();
  useBodyScrollLock(true);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const controller = new AbortController();control.current=controller;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    appApi<LinkState>('/api/session',{action:'linkStatus'},{signal:controller.signal})
      .then(value=>{if(!controller.signal.aborted)setInfo(value);})
      .catch(()=>{if(!controller.signal.aborted)setError('Não foi possível conferir seu link. Feche e tente novamente.');})
      .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return ()=>{control.current?.abort();previous?.focus();};
  },[]);
  useEffect(()=>{
    if(!busy&&!panel.current?.contains(document.activeElement))panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  },[busy]);
  async function change(action:'createLink'|'revokeLink') {
    if(busy||code.length!==10||!confirm)return;
    const controller=new AbortController();control.current=controller;
    setBusy(true);setError('');setNotice('');setCopied(false);
    setInfo(previous=>previous?{...previous,url:undefined}:previous);
    try {
      const result=await appApi<LinkState>('/api/session',{action,code},{signal:controller.signal});
      if(controller.signal.aborted)return;
      if(action==='createLink') {
        const url=new URL(result.url || '');
        if(url.origin!==location.origin||!/^#access=[a-f0-9]{64}$/.test(url.hash)||!result.active||!result.expiresAt)throw new Error('Resposta inesperada. Feche e confira seu link novamente.');
        setInfo(result);setNotice('Link criado. Copie e guarde antes de fechar.');
      } else {
        if(result.revoked!==true)throw new Error('Não foi possível confirmar o cancelamento. Confira seu link novamente.');
        setInfo({active:false});setNotice('Link cancelado. O acesso por código continua disponível.');
      }
      setCode('');setConfirm(false);
    } catch(cause) {
      if(!controller.signal.aborted) {
        setError(cause instanceof Error?cause.message:'Não foi possível concluir. Confira o estado antes de tentar novamente.');
        // A lost write acknowledgement may already have changed the registry.
        try {const current=await appApi<LinkState>('/api/session',{action:'linkStatus'},{signal:controller.signal});if(!controller.signal.aborted)setInfo(current);} catch { /* Keep the error; never repeat the mutation automatically. */ }
      }
    } finally {if(!controller.signal.aborted)setBusy(false);}
  }
  async function copy() {
    try {await navigator.clipboard.writeText(info!.url!);setCopied(true);setError('');}
    catch {setError('Não foi possível copiar. Selecione o link abaixo e copie manualmente.');}
  }
  function keyboard(event:React.KeyboardEvent) {
    if(event.key==='Escape'){event.stopPropagation();onClose();}
    if(event.key!=='Tab')return;
    const nodes=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')||[]);
    const first=nodes[0],last=nodes[nodes.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5" onKeyDown={keyboard}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="personal-access-title" className="workspace-dialog flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 p-5 dark:border-neutral-800">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500"><Link2 size={21}/></span>
        <div className="min-w-0 flex-1"><h2 id="personal-access-title" className="font-bold">Meu link de acesso</h2><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Abra no celular ou no PC, sem digitar o código.</p></div>
        <button onClick={onClose} aria-label="Fechar link de acesso" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={20}/></button>
      </header>
      <div className="space-y-4 overflow-y-auto p-5">
        <p className="rounded-2xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Este link funciona como uma senha. Guarde nos seus favoritos e não envie para grupos.</p>
        {busy&&!info?<p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={17} className="animate-spin"/>Conferindo seu link…</p>:info&&<>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{info.active?`Link ativo até ${new Date(info.expiresAt!).toLocaleDateString('pt-BR')}.`:'Você ainda não tem um link ativo.'}</p>
          {info.url&&<div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/40">
            <label className="block text-xs font-medium">Seu link pessoal<input aria-label="Seu link pessoal" readOnly value={info.url} onFocus={event=>event.currentTarget.select()} className="mt-2 w-full min-w-0 rounded-lg border border-blue-200 bg-white p-2 text-xs text-neutral-800 dark:border-blue-800 dark:bg-neutral-950 dark:text-white"/></label>
            <button onClick={copy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500">{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Link copiado':'Copiar meu link'}</button>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">Por segurança, ele só aparece agora. Se perder, crie outro; o anterior será cancelado.</p>
          </div>}
          <details open={!info.url} className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <summary className="cursor-pointer text-sm font-medium">{info.active?'Substituir ou cancelar o link':'Criar link válido por 9 dias'}</summary>
            <label className="block text-sm">Confirme seu código de acesso<input type="password" name="access-link-code" inputMode="numeric" autoComplete="off" value={code} maxLength={10} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 tracking-widest outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-950"/></label>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400"><input type="checkbox" checked={confirm} onChange={event=>setConfirm(event.target.checked)} className="mt-0.5"/>{info.active?'Entendo que isso cancela o link anterior e encerra as sessões abertas por ele.':'Entendo que qualquer pessoa com este link poderá acessar e gerenciar as mídias.'}</label>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy||code.length!==10||!confirm} onClick={()=>change('createLink')} className="flex-1 rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40">{busy?'Aguarde…':info.active?'Criar outro link':'Criar meu link'}</button>
              {info.active&&<button disabled={busy||code.length!==10||!confirm} onClick={()=>change('revokeLink')} className="rounded-xl border border-rose-300 px-3 py-3 text-sm font-medium text-rose-700 disabled:opacity-40 dark:border-rose-900 dark:text-rose-300">Cancelar link</button>}
            </div>
          </details>
        </>}
        {notice&&<p role="status" className="text-sm text-blue-700 dark:text-blue-300">{notice}</p>}
        {error&&<p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </div>
    </div>
  </div>;
}
