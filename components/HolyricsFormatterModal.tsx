import React, {useEffect, useMemo, useState} from 'react';
import {X, Music, Copy, Check} from 'lucide-react';
import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import {prepareSongs} from '../services/songbook';

interface HolyricsFormatterModalProps {
  isOpen:boolean;
  onClose:()=>void;
  showToast:(message:string,type:'success'|'error'|'info')=>void;
}

export const HolyricsFormatterModal:React.FC<HolyricsFormatterModalProps>=({isOpen,onClose,showToast})=>{
  const [source,setSource]=useState('');
  const [active,setActive]=useState(0);
  const [titles,setTitles]=useState<Record<number,string>>({});
  const [overrides,setOverrides]=useState<Record<number,'keep'|'remove'>>({});
  const [removeCredits,setRemoveCredits]=useState(true);
  const [removeSections,setRemoveSections]=useState(true);
  const [removeSymbols,setRemoveSymbols]=useState(true);
  const [removeChords,setRemoveChords]=useState(true);
  const [copied,setCopied]=useState<'title'|'lyrics'|null>(null);
  const [reviewLimit,setReviewLimit]=useState(20);
  const result=useMemo(()=>prepareSongs(source,{removeCredits,removeSections,removeSymbols,removeChords,overrides}),
    [source,removeCredits,removeSections,removeSymbols,removeChords,overrides]);
  const index=Math.min(active,Math.max(0,result.songs.length-1));
  const song=result.songs[index];
  const title=titles[index]??song?.title??'';
  useEffect(()=>setCopied(null),[title,song?.lyrics]);
  const updateSource=(text:string)=>{setSource(text);setActive(0);setTitles({});setOverrides({});setCopied(null);setReviewLimit(20);};
  const overrideLine=(line:number,action?:'keep'|'remove')=>{
    setCopied(null);
    setOverrides(previous=>{const next={...previous};if(action)next[line]=action;else delete next[line];return next;});
  };
  const copy=async(kind:'title'|'lyrics')=>{
    const value=kind==='title'?title:song?.lyrics;
    if(!value)return;
    try{await navigator.clipboard.writeText(value);setCopied(kind);showToast(kind==='title'?'Nome copiado.':'Letra copiada.','success');}
    catch{showToast('Não foi possível copiar. Selecione o texto e copie manualmente.','error');}
  };
  useBodyScrollLock(isOpen);
  if(!isOpen)return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-label="Formatador Holyrics / Projeção" className="workspace-dialog w-full max-w-4xl max-h-[92dvh] overflow-hidden flex flex-col bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <header className="flex items-center justify-between gap-3 p-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0"><span className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 p-3 text-blue-500"><Music size={20}/></span><div><h2 className="text-base font-bold">Letras para o Holyrics</h2><p className="mt-1 text-xs text-neutral-500">Cole as músicas. Copie o nome e a letra.</p></div></div>
        <button type="button" onClick={onClose} aria-label="Fechar formatador" className="shrink-0 rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={20}/></button>
      </header>
      <div className="dialog-scroll min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
        {result.error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-600 dark:text-rose-300">{result.error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2"><label htmlFor="lyrics-source" className="text-xs font-semibold">Texto original</label>{source && <button type="button" onClick={()=>updateSource('')} className="text-xs text-neutral-500 hover:text-rose-500">Limpar texto</button>}</div>
            <textarea id="lyrics-source" aria-label="Letra original" value={source} onChange={event=>updateSource(event.target.value)} placeholder={'Nome da música\nAutor, se houver\n\nCole a letra aqui…'} className="w-full min-h-28 h-32 md:h-[26rem] resize-y rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="min-w-0 space-y-3">
            {result.songs.length>1 && <label className="block text-xs font-semibold">Música · {index+1} de {result.songs.length}<select aria-label="Música para copiar" value={index} onChange={event=>{setActive(Number(event.target.value));setCopied(null);setReviewLimit(20);}} className="mt-2 block w-full min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm">{result.songs.map((item,i)=><option key={i} value={i}>{i+1}. {titles[i]??item.title}</option>)}</select></label>}
            <label className="block text-xs font-semibold">Nome da música<input aria-label="Nome da música" value={title} onChange={event=>{setTitles(previous=>({...previous,[index]:event.target.value}));setCopied(null);}} disabled={!song} className="mt-2 block w-full min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm disabled:opacity-50"/></label>
            <label className="block text-xs font-semibold">Letra limpa<textarea aria-label="Resultado para o Holyrics" readOnly value={song?.lyrics??''} placeholder="A letra limpa aparece aqui." className="mt-2 block w-full h-60 md:h-72 resize-y rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 p-4 text-sm font-normal leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"/></label>
          </div>
        </div>
        <details className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <summary className="cursor-pointer p-3 text-xs font-semibold">Opções de limpeza</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 pt-0 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={removeSymbols} onChange={e=>setRemoveSymbols(e.target.checked)}/>Remover emojis e decoração</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={removeSections} onChange={e=>setRemoveSections(e.target.checked)}/>Remover Trecho, Refrão e repetições indicadas</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={removeCredits} onChange={e=>setRemoveCredits(e.target.checked)}/>Remover créditos de autor</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={removeChords} onChange={e=>setRemoveChords(e.target.checked)}/>Remover linhas de cifras</label>
          </div>
          <p className="px-3 pb-3 text-xs leading-relaxed text-neutral-500">Sem títulos claros entre as músicas? Cole uma por vez. A letra original sempre fica disponível para conferir.</p>
        </details>
        {song && (song.changes.length>0||song.review.length>0) && <details className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <summary className="cursor-pointer p-3 text-xs font-semibold">Conferir o que foi removido{song.review.length>0?' · há conteúdo para revisar':''}</summary>
          <div className="space-y-3 p-3 pt-0 text-xs">
            <p className="leading-relaxed text-neutral-500">A limpeza é local. Confira o resultado; o original permanece disponível.</p>
            {song.review.slice(0,reviewLimit).map(row=><div key={`review-${row.line}`} className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2"><p className="break-words whitespace-pre-wrap">{row.text}</p><p className="text-neutral-500">Conteúdo mantido por precaução.</p><button type="button" onClick={()=>overrideLine(row.line,'remove')} className="text-blue-600 dark:text-blue-400 underline">Remover esta linha</button></div>)}
            {song.changes.slice(0,reviewLimit).map(row=><div key={`change-${row.line}`} className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-3 space-y-2"><p className="break-words whitespace-pre-wrap">{row.before}</p><p className="text-neutral-500">{row.kept?'Original mantido':row.reason}</p><button type="button" onClick={()=>overrideLine(row.line,row.kept?undefined:'keep')} className="text-blue-600 dark:text-blue-400 underline">{row.kept?'Aplicar limpeza':'Manter original'}</button></div>)}
            {Math.max(song.changes.length,song.review.length)>reviewLimit && <button type="button" onClick={()=>setReviewLimit(n=>n+20)} className="secondary-button">Mostrar mais</button>}
          </div>
        </details>}
      </div>
      <footer className="shrink-0 flex flex-wrap justify-end gap-2 p-4 border-t border-neutral-200 dark:border-neutral-800">
        <button type="button" disabled={!title} onClick={()=>copy('title')} className="secondary-button inline-flex items-center gap-2 px-3 py-2.5 text-xs disabled:opacity-40">{copied==='title'?<Check size={15}/>:<Copy size={15}/>}Copiar nome</button>
        <button type="button" disabled={!song?.lyrics||Boolean(result.error)} onClick={()=>copy('lyrics')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{copied==='lyrics'?<Check size={15}/>:<Copy size={15}/>}Copiar letra</button>
      </footer>
    </section>
  </div>;
};
