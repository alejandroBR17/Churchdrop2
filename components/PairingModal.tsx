import React,{useEffect,useRef,useState} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {X,Loader2,Smartphone,CheckCircle} from 'lucide-react';
import {appApi,AppApiError} from '../services/appApi';
import type {PairLink,PairState} from '../services/pairing';
import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import {useDialogEscape} from '../hooks/useDialogEscape';

interface Props {mode:'request'|'invite'|'approve'|'join';link?:PairLink;onClose:()=>void;onAuthorized:(result:PairState)=>void;}
export function PairingModal({mode,link,onClose,onAuthorized}:Props){
  const [state,setState]=useState<PairState|null>(null),[remember,setRemember]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ended,setEnded]=useState(false);
  const generation=useRef(0),operation=useRef<AbortController>();
  const authorized=useRef(onAuthorized);authorized.current=onAuthorized;
  const close=()=>{
    if(busy)return;
    if(state&&!ended&&(mode==='request'||mode==='join'))void appApi('/api/session',{action:'pairCancel',id:state.id}).catch(()=>{});
    if(state&&!ended&&mode==='invite')void appApi('/api/session',{action:'pairReject',id:state.id,token:state.approvalToken}).catch(()=>{});
    onClose();
  };
  useBodyScrollLock(true);useDialogEscape(true,close);
  useEffect(()=>()=>{generation.current++;operation.current?.abort();},[]);
  // Poll only an explicitly created request. No mutation runs during mount or
  // StrictMode rehearsal; the user generates the QR/joins with a button.
  useEffect(()=>{
    if(!state||ended||mode==='approve'||mode==='join'&&!state.id)return;
    let disposed=false,timer:ReturnType<typeof setTimeout>|undefined;
    const controller=new AbortController();
    async function poll(){
      if(disposed)return;
      if(state!.expiresAt && Date.now()>=state!.expiresAt){setError('Este QR Code venceu. Gere outro.');setEnded(true);return;}
      if(document.hidden||!navigator.onLine){timer=setTimeout(poll,3000);return;}
      try{
        const result=await appApi<PairState>('/api/session',mode==='invite'?{action:'pairInspect',id:state!.id,token:state!.approvalToken}:{action:'pairPoll',id:state!.id},{signal:controller.signal});
        if(disposed)return;
        setError('');
        if(result.success){setEnded(true);authorized.current(result);return;}
        if(['rejected','cancelled','consumed'].includes(result.status||'')){setState(previous=>({...previous,...result}));setEnded(true);return;}
        // Keep QR URL and the issuer's approval capability only in this modal.
        setState(previous=>({...previous,...result}));
      }catch(cause){if(!disposed){setError(cause instanceof Error?cause.message:'Não foi possível conferir. Tentaremos novamente.');if(cause instanceof AppApiError&&[409,410].includes(cause.status)){setEnded(true);return;}}}
      if(!disposed)timer=setTimeout(poll,3000);
    }
    timer=setTimeout(poll,1500);
    return()=>{disposed=true;controller.abort();clearTimeout(timer);};
  },[state?.id,ended,mode]);
  const act=async(action:string)=>{
    if(busy)return;
    const current=++generation.current,controller=new AbortController();operation.current?.abort();operation.current=controller;
    setBusy(true);setError('');
    try{
      const result=await appApi<PairState>('/api/session',{action,remember,...(mode==='approve'||mode==='join'?{id:link?.id,token:link?.token}:action==='pairApprove'||action==='pairReject'?{id:state?.id,token:state?.approvalToken}:{}),...(action==='pairApprove'?{confirm:true}:{})},{signal:controller.signal});
      if(current!==generation.current)return;
      if(action==='pairApprove'||action==='pairReject'){setState(previous=>({...previous,...result}));setEnded(true);}
      else{setState(result);setEnded(false);}
    }catch(cause){if(current===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível concluir. Tente novamente.');}
    finally{if(current===generation.current)setBusy(false);}
  };
  const approve=mode==='approve'||mode==='invite'&&state?.status==='pending';
  const finished=ended&&['approved','rejected','cancelled','consumed'].includes(state?.status||'');
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-label="Autorizar outro aparelho" className="workspace-dialog w-full max-w-md overflow-y-auto bg-white p-5 text-neutral-900 dark:bg-neutral-900 dark:text-white">
      <header className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{mode==='request'?'Entrar pelo celular':mode==='join'?'Conectar este aparelho':'Autorizar outro aparelho'}</h2><button type="button" aria-label="Fechar autorização" disabled={busy} onClick={close} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={20}/></button></header>
      {finished?<div className="space-y-3 text-center"><CheckCircle className="mx-auto text-blue-600" size={36}/><p role="status">{state?.status==='approved'?'Aparelho autorizado. Ele já pode concluir a entrada.':state?.status==='consumed'?'O outro aparelho entrou.':'Solicitação encerrada.'}</p><button onClick={close} className="primary-button">Concluir</button></div>:<div className="space-y-4">
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{mode==='request'?'Abra a câmera do celular que já está conectado ao Univer Mídia, escaneie o QR e confirme o acesso.':mode==='invite'?'Escaneie com a câmera do novo aparelho. Depois, confirme aqui qual aparelho pode entrar.':mode==='join'?'Solicite o acesso e confirme no aparelho que mostrou o QR Code. Não é preciso digitar senha ou código.':'Confira o aparelho abaixo antes de confirmar. Autorize somente se foi você quem iniciou a entrada.'}</p>
        {(mode==='request'||mode==='join')&&!state&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="mt-1"/><span>Este aparelho é meu · lembrar por até 7 dias<span className="mt-1 block text-xs text-neutral-500">O acesso também depende da validade do aparelho que autorizar.</span></span></label>}
        {state?.url&&!approve&&<div className="mx-auto w-fit rounded-2xl bg-white p-3"><QRCodeSVG value={state.url} size={220} marginSize={2} title="Autorizar aparelho no Univer Mídia" className="h-auto max-w-full"/></div>}
        {mode==='approve'&&!state&&<button disabled={busy} onClick={()=>act('pairInspect')} className="primary-button w-full">Conferir aparelho</button>}
        {approve&&state?.label&&<div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30"><Smartphone size={24} className="mb-2 text-blue-600"/><p className="font-semibold">{state.label}</p><p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{state.remember?'Solicitou lembrar o acesso neste aparelho.':'Acesso temporário, por até 8 horas.'}</p></div>}
        {approve&&state?.status==='pending'&&<div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>act('pairApprove')} className="primary-button flex-1">Autorizar este aparelho</button><button disabled={busy} onClick={()=>act('pairReject')} className="secondary-button">Recusar</button></div>}
        {!state&&mode!=='approve'&&<button disabled={busy} onClick={()=>act(mode==='request'?'pairCreate':mode==='invite'?'pairInvite':'pairJoin')} className="primary-button w-full">{busy?<Loader2 size={18} className="animate-spin"/>:null}{mode==='join'?'Solicitar acesso':'Gerar QR Code'}</button>}
        {state&&!approve&&!ended&&<p role="status" className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300"><Loader2 size={16} className="animate-spin"/>{mode==='invite'&&state.status==='invited'?'Aguardando o outro aparelho escanear…':'Aguardando confirmação no aparelho conectado…'}</p>}
        {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        {ended&&!finished&&<button disabled={busy} onClick={()=>{setState(null);setEnded(false);setError('');}} className="secondary-button">{mode==='join'||mode==='approve'?'Tentar novamente':'Gerar novo QR Code'}</button>}
        <p className="text-xs text-neutral-500">QR válido por 5 minutos, para uma única entrada. Nenhuma senha é compartilhada.</p>
      </div>}
    </section>
  </div>;
}
