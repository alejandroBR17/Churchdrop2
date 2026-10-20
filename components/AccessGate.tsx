import React, {useEffect, useRef, useState} from 'react';
import {KeyRound, Link2, Loader2, LogOut, ShieldCheck} from 'lucide-react';
import {appApi} from '../services/appApi';
import {clearOperatorData} from '../services/churchService';
import {clearAccessLink, hasAccessLink, usePendingAccessLink} from '../services/accessLink';
import {PersonalAccessModal} from './PersonalAccessModal';

type Session = {enabled: boolean; authenticated: boolean; remembered?: boolean; expiresAt?: number};
type AccessResult = {success?: boolean; remembered?: boolean; expiresAt?: number};
function rememberPreference() {try {return localStorage.getItem('univer-remember-device') === '1';} catch {return false;}}
function savePreference(remember:boolean) {try {localStorage.setItem('univer-remember-device', remember?'1':'0');} catch { /* A blocked preference must not break access. */ }}
export function AccessGate({children}: {children: React.ReactNode}) {
  const [state, setState] = useState<'checking' | 'preparing' | 'locked' | 'open' | 'error'>('checking');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(rememberPreference);
  const [sessionInfo, setSessionInfo] = useState<AccessResult>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [remembering, setRemembering] = useState(false);
  const [error, setError] = useState('');
  const [showLink,setShowLink] = useState(false);
  const checking = useRef<AbortController>();
  async function check() {
    checking.current?.abort(); const controller = new AbortController(); checking.current = controller;
    setState('checking'); setError('');
    try {
      const session = await appApi<Session>('/api/session', undefined, {signal: controller.signal});
      if (!controller.signal.aborted) {
        if (session.enabled && !session.authenticated && hasAccessLink()) {
          const result=await usePendingAccessLink();
          if(controller.signal.aborted)return;
          if(result.success!==true)throw new Error('Link unavailable');
          setSessionInfo(result);setState('open');setNotice('Acesso pelo seu link. Em aparelho emprestado, use Sair ao terminar.');return;
        }
        if(session.authenticated)clearAccessLink();
        setSessionInfo(session);
        setState(!session.enabled ? 'preparing' : session.authenticated ? 'open' : 'locked');
      }
    } catch (cause) { if (!controller.signal.aborted) {setState('error'); setError(hasAccessLink() && cause instanceof Error ? cause.message : 'Não foi possível verificar o acesso. Confira a conexão.');} }
  }
  useEffect(() => {
    clearOperatorData(); void check();
    const expired = () => {clearOperatorData(); setShowLink(false);setCode(''); setState('locked'); setError('Sua sessão terminou. Entre novamente.');};
    window.addEventListener('univer-session-expired', expired);
    return () => {checking.current?.abort(); window.removeEventListener('univer-session-expired', expired);};
  }, []);
  async function enter(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await appApi<AccessResult>('/api/session', {code, remember});
      if (result.success !== true) throw new Error('O acesso ainda está sendo preparado. Tente novamente mais tarde.');
      savePreference(remember); setSessionInfo(result); setNotice('');
      clearAccessLink();
      clearOperatorData(); setCode(''); setState('open');
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');}
    finally {setBusy(false);}
  }
  async function rememberDevice() {
    if (busy) return;
    setBusy(true); setRemembering(true); setError(''); setNotice('');
    try {
      const result = await appApi<AccessResult>('/api/session', {action:'remember',remember:true});
      if (result.success !== true || result.remembered !== true) throw new Error('Não foi possível salvar o acesso.');
      savePreference(true); setRemember(true); setSessionInfo(result);
      setNotice('Acesso salvo por 7 dias neste aparelho.');
    } catch {setError('Não foi possível lembrar o aparelho. Confira a conexão e tente novamente.');}
    finally {setBusy(false);setRemembering(false);}
  }
  async function leave() {
    setBusy(true); setError('');
    try { await appApi('/api/session', undefined, {method: 'DELETE'}); clearOperatorData(); clearAccessLink();setShowLink(false);savePreference(false); setRemember(false); setSessionInfo({}); setNotice(''); setState('locked'); }
    catch {setError('Não foi possível encerrar a sessão. Tente novamente antes de devolver o aparelho.');}
    finally {setBusy(false);}
  }
  if (state === 'open') return <>
    <div className="operator-strip bg-neutral-900 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-2"><ShieldCheck size={16}/>{sessionInfo.remembered && sessionInfo.expiresAt ? `Conectado até ${new Date(sessionInfo.expiresAt).toLocaleDateString('pt-BR')}` : 'Acesso de operador'}</span>
      <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={()=>setShowLink(true)} disabled={busy} className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 disabled:opacity-50"><Link2 size={16}/>Meu link</button>
      {!sessionInfo.remembered && <button type="button" onClick={rememberDevice} disabled={busy} className="rounded-lg border border-blue-500/50 px-3 py-2 text-blue-200 disabled:opacity-50">{remembering?'Salvando…':'Lembrar 7 dias'}</button>}
      <button type="button" onClick={leave} disabled={busy} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"><LogOut size={16}/> {busy && !remembering ? 'Saindo…' : 'Sair deste aparelho'}</button>
      </div>
    </div>
    {notice && <p role="status" className="bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100 px-4 py-2 text-xs">{notice}</p>}
    {error && <p role="alert" className="bg-rose-50 text-rose-800 p-3 text-sm">{error}</p>}
    {children}
    {showLink&&<PersonalAccessModal onClose={()=>setShowLink(false)}/>}
  </>;
  return <main className="access-page min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-5">
    <section className="access-card w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-5"><KeyRound size={24}/></div>
      <p className="text-xs uppercase tracking-widest text-amber-400 mb-2">Univer Mídia</p>
      <h1 className="text-2xl font-bold mb-3">{state === 'preparing' ? 'Preparando seu novo espaço' : 'Suas mídias, no lugar certo'}</h1>
      {state === 'checking' ? <p role="status" className="flex items-center gap-2 text-neutral-400"><Loader2 size={18} className="animate-spin"/> Verificando acesso…</p> : state === 'locked' ? <form onSubmit={enter} className="space-y-5">
        {typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app') && window.location.hostname !== 'churchdrop2.vercel.app' && <a href="https://churchdrop2.vercel.app/" className="block rounded-xl border border-blue-800 bg-blue-950/40 p-3 text-sm text-blue-200">Usar o endereço fixo do app →<span className="mt-1 block text-xs text-neutral-400">O acesso salvo em links de prévia não passa para outro endereço.</span></a>}
        <p className="text-sm leading-relaxed text-neutral-400">Use o código de operador para enviar e organizar os materiais. Não precisa entrar com uma conta Google.</p>
        <label className="block text-sm font-medium">Código de acesso
          <input type="hidden" name="username" value="operador" autoComplete="username"/>
          <input autoFocus name="password" type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{10}" maxLength={10} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" aria-describedby="code-help"/>
        </label>
        <p id="code-help" className="text-xs text-neutral-400">10 números. Peça o código ao responsável pelo Univer Mídia.</p>
        <label className="flex items-start gap-3 text-sm text-neutral-300"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="mt-1"/><span>Este aparelho é meu · lembrar por 7 dias<span className="block mt-1 text-xs text-neutral-500">Atualizações no link fixo mantêm o acesso. Em aparelho emprestado, deixe desmarcado e use Sair ao terminar.</span></span></label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button disabled={busy || code.length !== 10} className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 font-semibold disabled:opacity-50">{busy ? 'Verificando…' : 'Entrar'}</button>
      </form> : <>
        <p className="text-sm leading-relaxed text-neutral-400">{state === 'preparing' ? 'Estamos conectando o acesso seguro e o novo armazenamento. Nenhum arquivo antigo será alterado.' : error}</p>
        <button onClick={check} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold">Verificar novamente</button>
        {state==='error'&&<button onClick={()=>{clearAccessLink();setError('');setState('locked');}} className="mt-3 w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm">Entrar com o código</button>}
      </>}
    </section>
  </main>;
}
