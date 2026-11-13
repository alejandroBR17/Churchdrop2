import React,{useEffect,useState,useRef} from 'react';
import {X,Smartphone,Loader2} from 'lucide-react';
import {appApi} from '../services/appApi';
import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import {useDialogEscape} from '../hooks/useDialogEscape';
interface Device {id:string;label:string;current:boolean;seenAt:number;expiresAt:number;}
export function ConnectedDevicesModal({onClose,onInvite,onRevoked}:{onClose:()=>void;onInvite:()=>void;onRevoked:()=>void}){
  const [devices,setDevices]=useState<Device[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[confirm,setConfirm]=useState<Device|null>(null);
  const request=useRef<AbortController>();
  useBodyScrollLock(true);useDialogEscape(true,()=>{if(!busy)onClose();});
  const load=async()=>{request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);setError('');try{const result=await appApi<{devices:Device[]}>('/api/session',{action:'devices'},{signal:controller.signal});if(!controller.signal.aborted)setDevices(result.devices);}catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Não foi possível carregar.');}finally{if(!controller.signal.aborted)setLoading(false);}};
  useEffect(()=>{void load();return()=>request.current?.abort();},[]);
  const revoke=async()=>{if(!confirm||busy)return;const target=confirm;setBusy(target.id);setError('');try{await appApi('/api/session',{action:'revokeDevice',id:target.id});if(target.current){onRevoked();return;}setConfirm(null);await load();}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível encerrar o acesso.');}finally{setBusy('');}};
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Aparelhos conectados" className="workspace-dialog flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden text-neutral-900 dark:text-white">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 p-4 dark:border-neutral-700"><h2 className="text-lg font-bold">Aparelhos conectados</h2><button disabled={Boolean(busy)} aria-label="Fechar aparelhos conectados" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={20}/></button></header>
    <div className="dialog-scroll min-h-0 overflow-y-auto p-4">
    <p className="my-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">São os acessos autorizados, mesmo quando o aparelho está offline. Encerrar também bloqueia os acessos que ele autorizou. Aparelhos antigos aparecem ao abrir a versão atual do app.</p>
    <button onClick={onInvite} disabled={Boolean(busy)} className="primary-button mb-4 w-full">Autorizar outro aparelho por QR Code</button>
    {loading?<p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin"/>Carregando aparelhos…</p>:<ul className="space-y-3">{devices.map(d=><li key={d.id} className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700"><div className="flex items-start gap-2"><Smartphone size={20} className="shrink-0 text-blue-600"/><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{d.label}{d.current?' · Este aparelho':''}</p><p className="mt-1 text-xs text-neutral-500">Último uso: {new Date(d.seenAt).toLocaleString('pt-BR')}<br/>Válido até: {new Date(d.expiresAt).toLocaleString('pt-BR')}</p></div></div><button disabled={Boolean(busy)} onClick={()=>setConfirm(d)} className="mt-3 min-h-11 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:text-rose-300">Encerrar acesso{d.current?' neste aparelho':''}</button></li>)}</ul>}
    </div>
    {confirm&&<div className="mx-4 mb-4 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30"><p className="text-sm">Encerrar o acesso de <strong>{confirm.label}</strong> e dos aparelhos que ele autorizou?</p><div className="mt-3 flex gap-2"><button disabled={Boolean(busy)} onClick={revoke} className="primary-button">{busy?'Encerrando…':'Sim, encerrar'}</button><button disabled={Boolean(busy)} onClick={()=>setConfirm(null)} className="secondary-button">Cancelar</button></div></div>}
    {error&&<div role="alert" className="m-4 shrink-0 text-sm text-rose-700 dark:text-rose-300">{error}<button disabled={Boolean(busy)} onClick={()=>void load()} className="secondary-button mt-2">Atualizar lista</button></div>}
  </section></div>;
}
