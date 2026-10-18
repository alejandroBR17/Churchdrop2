import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
import React, {useMemo, useState} from 'react';
import {formatLyrics} from '../services/lyricsFormatter';
import { X, Sparkles, Copy, Check, FileText, RefreshCw, Wand2, HelpCircle, Play, Trash2 } from 'lucide-react';

interface HolyricsFormatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SAMPLE_LYRIC = `🔴 Que Darei ao Senhor
( Fernando Rodrigues )

Como posso Te agradecer?
Por tantos benefícios que vivi?
Tomarei Teu cálice de salvação
E darei aos outros O que recebi

( Trecho )
Glorificarei Teu nome Oh Deus
Farei Tua vontade
Pois o Senhor me escolheu
Serei sempre uma fonte a jorrar
Eu Te exaltarei enquanto eu respirar

( Refrão ) 2x
Aleluia ao Senhor!
Glorificado seja o Seu nome
Aleluia ao Senhor!
Santificado seja o Meu Salvador`;

export const HolyricsFormatterModal: React.FC<HolyricsFormatterModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [rawText, setRawText] = useState('');
  const [copied, setCopied] = useState(false);
  const [stanzasMaxLines, setStanzasMaxLines] = useState<number>(2);
  const [removeEmojis, setRemoveEmojis] = useState(true);
  const [removeSectionTags, setRemoveSectionTags] = useState(true);
  const [removeCredits, setRemoveCredits] = useState(true);
  const [uppercaseTitle, setUppercaseTitle] = useState(true);

  const [removeChords, setRemoveChords] = useState(true);
  const [firstLineIsTitle, setFirstLineIsTitle] = useState(true);
  const [overrides, setOverrides] = useState<Record<number, 'keep' | 'remove'>>({});
  const [reviewLimit, setReviewLimit] = useState(30);
  const result = useMemo(()=>formatLyrics(rawText, {linesPerSlide:stanzasMaxLines,
    removeSymbols:removeEmojis,removeSections:removeSectionTags,removeCredits,removeChords,
    firstLineIsTitle,uppercaseTitle,overrides}),[rawText,stanzasMaxLines,removeEmojis,removeSectionTags,removeCredits,removeChords,firstLineIsTitle,uppercaseTitle,overrides]);
  const formattedText = result.text;
  const updateSource = (text: string) => {setRawText(text);setOverrides({});setCopied(false);setReviewLimit(30);};
  const overrideLine = (line: number, action?: 'keep' | 'remove') => setOverrides(previous=>{
    const next={...previous}; if(action)next[line]=action;else delete next[line];return next;
  });

  const handleCopyFormatted = () => {
    if (!formattedText) {
      showToast('Digite ou cole uma letra primeiro!', 'error');
      return;
    }
    navigator.clipboard.writeText(formattedText)
      .then(() => {
        setCopied(true);
        showToast('Copiado para a área de transferência!', 'success');
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        showToast('Erro ao copiar texto.', 'error');
      });
  };

  const loadSampleLyric = () => {
    updateSource(SAMPLE_LYRIC);
    showToast('Exemplo de louvor carregado e formatado!', 'info');
  };

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-label="Formatador Holyrics / Projeção" className="workspace-dialog relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden flex flex-col max-h-[92dvh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
              <Sparkles size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">Formatador Holyrics / Projeção</h2>

              </div>
              <p className="text-xs text-neutral-500">Prepare letras e textos para a projeção.</p>
            </div>
          </div>
          <button aria-label="Fechar formatador" onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="dialog-scroll p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          
          {/* Options Toolbar */}
          <div className="p-4 bg-purple-50/50 dark:bg-neutral-800/60 rounded-2xl border border-purple-100 dark:border-neutral-800 text-xs space-y-3">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="font-bold text-neutral-800 dark:text-neutral-200">
                  Linhas por Slide:
                </label>
                <select 
                  value={stanzasMaxLines} 
                  onChange={(e) => setStanzasMaxLines(Number(e.target.value))}
                  className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-1.5 font-bold outline-none text-purple-600 dark:text-purple-400 shadow-xs cursor-pointer"
                >
                  <option value={2}>2 Linhas (Padrão Holyrics)</option>
                  <option value={3}>3 Linhas</option>
                  <option value={4}>4 Linhas</option>
                  <option value={0}>Manter Parágrafos Originais</option>
                </select>
              </div>

              {/* Prominent Test Button in Options Bar */}
              <button 
                type="button" 
                onClick={loadSampleLyric}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer"
              >
                <Sparkles size={15} />
                <span>Testar com exemplo</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t border-purple-200/60 dark:border-neutral-700/60">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                <input 
                  type="checkbox" 
                  checked={removeEmojis} 
                  onChange={(e) => setRemoveEmojis(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Limpar emojis e símbolos</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                <input 
                  type="checkbox" 
                  checked={removeSectionTags} 
                  onChange={(e) => setRemoveSectionTags(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Remover seções e repetições</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                <input 
                  type="checkbox" 
                  checked={removeCredits} 
                  onChange={(e) => setRemoveCredits(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Remover créditos identificados</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                <input 
                  type="checkbox" 
                  checked={uppercaseTitle} 
                  onChange={(e) => setUppercaseTitle(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Título em MAIÚSCULAS</span>
              </label>
              <label className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300"><input type="checkbox" checked={removeChords} onChange={e=>setRemoveChords(e.target.checked)}/><span>Remover linhas de cifras</span></label>
              <label className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300"><input type="checkbox" checked={firstLineIsTitle} onChange={e=>setFirstLineIsTitle(e.target.checked)}/><span>Primeira linha é o título</span></label>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-500">Análise local, sem enviar a letra para uma IA. Frases duvidosas são mantidas para sua revisão.</p>
          </div>

          {result.error && <p role="alert" className="text-sm text-rose-500">{result.error}</p>}
          {(result.changes.length>0 || result.review.length>0) && <details className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
            <summary className="text-xs font-semibold cursor-pointer">Revisar limpeza · {result.changes.length} ajustes · {result.review.length} para revisar</summary>
            <div className="mt-4 space-y-3">
              {result.review.slice(0,reviewLimit).map(row=><div key={`review-${row.line}`} className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-2"><p className="font-semibold">Linha {row.line}: conteúdo mantido</p><p className="break-words whitespace-pre-wrap">{row.text}</p><p className="text-neutral-500 leading-relaxed">{row.reason}</p><button onClick={()=>overrideLine(row.line,'remove')} className="text-amber-700 dark:text-amber-300 underline underline-offset-4">Remover esta linha</button></div>)}
              {result.changes.slice(0,reviewLimit).map(row=><div key={`change-${row.line}`} className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-3 text-xs space-y-2"><p className="font-semibold">Linha {row.line} · {row.kept ? 'Original mantido' : row.reason}</p><p className="break-words whitespace-pre-wrap text-neutral-500">{row.before}</p>{row.after && <p className="break-words whitespace-pre-wrap">{row.after}</p>}<button onClick={()=>overrideLine(row.line,row.kept ? undefined : 'keep')} className="text-blue-600 dark:text-blue-400 underline underline-offset-4">{row.kept ? 'Aplicar limpeza' : 'Manter original'}</button></div>)}
              {Math.max(result.changes.length,result.review.length)>reviewLimit && <button onClick={()=>setReviewLimit(n=>n+30)} className="secondary-button">Mostrar mais alterações</button>}
            </div>
          </details>}

          {/* Text Areas Input / Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* RAW INPUT */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Letra Bruta (Original):
                </label>
                {rawText && (
                  <button 
                    onClick={() => updateSource('')}
                    className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
              <textarea aria-label="Letra original"
                value={rawText}
                onChange={(e) => updateSource(e.target.value)}
                placeholder="Cole aqui a letra do louvor com emojis, parênteses, trecho, autor..."
                className="w-full h-72 p-3.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl text-xs font-mono text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none custom-scrollbar leading-relaxed"
              />
            </div>

            {/* FORMATTED OUTPUT */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Resultado Formatado (Holyrics):
                </label>
                {formattedText && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Check size={13} />
                    <span>{result.slides} blocos · revise antes de copiar</span>
                  </span>
                )}
              </div>
              <textarea aria-label="Resultado para o Holyrics"
                value={formattedText}
                readOnly
                placeholder="A letra formatada e dividida em slides aparecerá aqui automaticamente..."
                className="w-full h-72 p-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs font-mono text-purple-300 outline-none resize-none custom-scrollbar leading-relaxed"
              />
            </div>

          </div>

        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between shrink-0">


          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopyFormatted}
              disabled={!formattedText}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 ${
                copied 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' 
                  : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copiado!' : 'Copiar Resultado'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


