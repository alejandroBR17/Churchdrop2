import React, { useState, useEffect } from 'react';
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
  if (!isOpen) return null;

  const [rawText, setRawText] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [stanzasMaxLines, setStanzasMaxLines] = useState<number>(2);
  const [removeEmojis, setRemoveEmojis] = useState(true);
  const [removeSectionTags, setRemoveSectionTags] = useState(true);
  const [removeCredits, setRemoveCredits] = useState(true);
  const [uppercaseTitle, setUppercaseTitle] = useState(true);

  // Comprehensive Regex engine for Emojis & Symbols (Step 1/2)
  const cleanEmojisAndSymbols = (str: string): string => {
    return str
      // Comprehensive Unicode Emojis, Symbols, Pictographs, Enclosed Alphanumerics & Shapes
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[🔴🟠🟡🟢🔵🟣⚫⚪🟤🎵🎶✝️🙏🔥✨🎤🎸🎹🕊️⛪✝️⚡⭐🌟💥👑💡📜📖📌🚩🏷️]/gu, '')
      // Remove unwanted markdown bullet prefixes (*, -, #, •, ~) at start of line
      .replace(/^[\s#\*\-•~>]+/g, '')
      .trim();
  };

  // Robust check for repeat markers, section headers, and credits (Step 1/2 Engine)
  const isNoiseLine = (line: string): { isNoise: boolean; reason: 'credit' | 'section' } => {
    const trimmed = line.trim();
    if (!trimmed) return { isNoise: false, reason: 'section' };

    // 1. Any line enclosed entirely in brackets/parentheses/braces/chevrons e.g. ( Fernando Rodrigues ), ( Trecho ), ( Refrão ) 2x, [ Intro ], (2x), [x2]
    const enclosedPattern = /^[\(\[\{<].*[\)\]\}>]\s*(\d+x|x\d+)?\s*$/i;
    if (enclosedPattern.test(trimmed)) {
      const authorKeywords = /autor|compositor|cantor|ministro|por|art|banda|letras|música/i;
      const isAuthor = authorKeywords.test(trimmed) || (!/refrã|coro|intro|ponte|solo|bis|2x|3x|4x|x2|x3|trecho|verso|tag|coda|ministração/i.test(trimmed));
      return { isNoise: true, reason: isAuthor ? 'credit' : 'section' };
    }

    // 2. Standalone multipliers e.g. 2x, 3x, 4x, (2x), [2x], x2, (x2)
    const repeatPattern = /^[\(\[\{]?\s*(\d+x|x\d+)\s*[\)\]\}]?$/i;
    if (repeatPattern.test(trimmed)) {
      return { isNoise: true, reason: 'section' };
    }

    // 3. Metadata labels e.g. Autor: ..., Compositor: ..., Tom: ..., BPM: ...
    const labelPattern = /^\s*(autor|compositor|cantor|artista|banda|tom|bpm|cifra|letra|versão|arranjo)\s*:/i;
    if (labelPattern.test(trimmed)) {
      return { isNoise: true, reason: 'credit' };
    }

    // 4. Standalone section headings e.g. Refrão, Coro, Intro, Introdução, Ponte, Verso 1, Trecho, Solo, Ministração, Bis, Tag, Coda
    const sectionPattern = /^\s*(refrão|refrã|coro|verso\s*\d*|trecho|intro|introdução|ponte|bridge|solo|bis|ministração|pré-refrão|pre-chorus|final|coda|tag|parte\s*\d*)\s*:?\s*(\d+x|x\d+)?\s*$/i;
    if (sectionPattern.test(trimmed)) {
      return { isNoise: true, reason: 'section' };
    }

    return { isNoise: false, reason: 'section' };
  };

  // Main formatting logic (Etapa 2/2 Complete Engine)
  const processFormatting = (text: string): string => {
    if (!text.trim()) return '';

    const lines = text.split('\n');
    let extractedAuthor = '';
    const cleanedLines: string[] = [];

    lines.forEach((line) => {
      let l = line.trim();

      // Clean emojis and extra bullet characters if option enabled
      if (removeEmojis) {
        l = cleanEmojisAndSymbols(l);
      }

      if (!l) {
        cleanedLines.push('');
        return;
      }

      // Check for noise lines (credits/authors/section tags)
      const noiseCheck = isNoiseLine(l);
      if (noiseCheck.isNoise) {
        if (noiseCheck.reason === 'credit') {
          // Extract author/credit if we want to keep it
          if (!removeCredits && !extractedAuthor) {
            extractedAuthor = l.replace(/^[\(\[\{<]|[\)\]\}>]$/g, '').trim();
          }
          return; // Strip credit from general lyric body
        }
        if (noiseCheck.reason === 'section' && removeSectionTags) return;
      }

      // Strip inline brackets or multipliers anywhere in the line e.g. (2x), [Refrão], (x2), ( Trecho )
      if (removeSectionTags) {
        l = l.replace(/[\(\[\{]\s*(refrão|refrã|coro|intro|introdução|ponte|bridge|solo|bis|ministração|trecho|verso\s*\d*|\d+x|x\d+)\s*[\)\]\}]/gi, '').trim();
        l = l.replace(/\s+(\d+x|x\d+)\s*$/gi, '').trim();
        // Remove trailing colons or excess space left over
        l = l.replace(/^[\s:\-•~>]+|[\s:\-•~>]+$/g, '').trim();
      }

      if (l) {
        cleanedLines.push(l);
      }
    });

    // Remove leading and trailing empty lines
    while (cleanedLines.length > 0 && cleanedLines[0] === '') cleanedLines.shift();
    while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') cleanedLines.pop();

    if (cleanedLines.length === 0) return '';

    // Title line is line 0
    const rawTitle = cleanedLines[0].replace(/^[\s:\-•~>]+|[\s:\-•~>]+$/g, '');
    let title = uppercaseTitle ? rawTitle.toUpperCase() : rawTitle;

    // Attach author credit if kept
    if (!removeCredits && extractedAuthor) {
      title += `\n(${extractedAuthor})`;
    }

    // Remaining lyric lines
    const lyricLines = cleanedLines.slice(1).filter(l => l.length > 0);

    const slides: string[] = [title];

    if (stanzasMaxLines === 0) {
      // Preserve original paragraph blocks
      let currentParagraph: string[] = [];
      cleanedLines.slice(1).forEach(line => {
        if (line === '') {
          if (currentParagraph.length > 0) {
            slides.push(currentParagraph.join('\n'));
            currentParagraph = [];
          }
        } else {
          currentParagraph.push(line);
        }
      });
      if (currentParagraph.length > 0) {
        slides.push(currentParagraph.join('\n'));
      }
    } else {
      // Group into N lines per slide (e.g. max 2 lines per slide for Holyrics)
      let currentSlide: string[] = [];
      lyricLines.forEach(line => {
        currentSlide.push(line);
        if (currentSlide.length === stanzasMaxLines) {
          slides.push(currentSlide.join('\n'));
          currentSlide = [];
        }
      });
      if (currentSlide.length > 0) {
        slides.push(currentSlide.join('\n'));
      }
    }

    return slides.join('\n\n');
  };

  // Real-time update whenever rawText or options change
  useEffect(() => {
    const result = processFormatting(rawText);
    setFormattedText(result);
  }, [rawText, stanzasMaxLines, removeEmojis, removeSectionTags, removeCredits, uppercaseTitle]);

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
    setRawText(SAMPLE_LYRIC);
    showToast('Exemplo de louvor carregado e formatado!', 'info');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">Formatador Holyrics / Projeção</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Etapa 2/2: Concluída
                </span>
              </div>
              <p className="text-xs text-neutral-500">Limpe emojis, marcadores e divida a letra em slides prontos para a igreja</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          
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
                <span>🧪 Testar com Exemplo (Que Darei ao Senhor)</span>
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
                <span>Remover Emojis (🔴)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                <input 
                  type="checkbox" 
                  checked={removeSectionTags} 
                  onChange={(e) => setRemoveSectionTags(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Remover Tags (Trecho / Refrão)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                <input 
                  type="checkbox" 
                  checked={removeCredits} 
                  onChange={(e) => setRemoveCredits(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Remover Autores ( Fernando... )</span>
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
            </div>

          </div>

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
                    onClick={() => setRawText('')}
                    className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
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
                    <span>Pronto para o Holyrics</span>
                  </span>
                )}
              </div>
              <textarea
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
          <button 
            onClick={loadSampleLyric}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
          >
            <Wand2 size={14} />
            <span>Testar Exemplo Prático</span>
          </button>

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
              <span>{copied ? 'Copiado para o Transferidor!' : 'Copiar Resultado'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


