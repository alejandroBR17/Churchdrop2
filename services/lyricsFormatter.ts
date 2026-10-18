/** Deterministic, local lyric analysis. Unknown parentheticals are never assumed to be credits. */
export interface FormatterOptions {
  linesPerSlide?: number;
  removeSymbols?: boolean;
  removeSections?: boolean;
  removeCredits?: boolean;
  removeChords?: boolean;
  firstLineIsTitle?: boolean;
  uppercaseTitle?: boolean;
  overrides?: Record<number, 'keep' | 'remove'>;
}
export interface LyricChange {line: number; before: string; after: string; reason: string; kept: boolean}
export interface LyricReview {line: number; text: string; reason: string}
export interface FormattedLyrics {text: string; changes: LyricChange[]; review: LyricReview[]; slides: number; error?: string}

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('pt-BR', {granularity: 'grapheme'}) : null;
const emoji = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Presentation}|\u20e3/u;
const decoration = /[★☆✦✧◆◇●○■□▪▫►▸♬♫♪♩✞✟✠†‡➤➔➜➢→←↑↓]/gu;
const invisible = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u00ad\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu;
const repeat = /^(?:\d{1,2}\s*[x×]|[x×]\s*\d{1,2}|bis)$/iu;
const section = /^(?:refr[aã]o|pr[eé][ -]?refr[aã]o|coro|chorus|pre[ -]?chorus|intro(?:du[cç][aã]o)?|ponte|bridge|verso|verse|estrofe|trecho|solo|instrumental|interl[uú]dio|ministra[cç][aã]o|final|coda|tag|parte)(?:\s*\d+)?$/iu;
const metadata = /^(?:autor(?:a)?|compositor(?:a)?|int[eé]rprete|cantor(?:a)?|artista|banda|letra|m[uú]sica|vers[aã]o|arranjo|tom|bpm|cifra)\s*:/iu;
const chord = /^[A-G](?:#|b)?(?:(?:maj|min|dim|aug|sus|add|m|M)?\d*(?:M|maj|sus|add)?\d*(?:\([\d+#b,/-]+\))?)(?:\/[A-G](?:#|b)?)?$/u;
function unwrap(text: string) {return text.replace(/^[([{]\s*|\s*[)\]}]$/g, '').trim();}
function isMarker(value: string) {
  const text = unwrap(value).replace(/:\s*$/, '').replace(/\s+(?:\d{1,2}\s*[x×]|[x×]\s*\d{1,2})\s*$/iu, '').trim();
  return section.test(text) || repeat.test(unwrap(value));
}
function chordLine(text: string) {
  const tokens = text.replace(/[|:]/g, ' ').trim().split(/\s+/);
  return tokens.length >= 2 && tokens.every(token => token.length <= 40 && (chord.test(token) || token === '%'));
}
function cleanSymbols(text: string) {
  const segments = segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
  const withoutEmoji = segments.filter(part => !emoji.test(part)).map(part => /[\uff01-\uff5e\u{1d400}-\u{1d7ff}]/u.test(part) ? part.normalize('NFKC') : part).join('');
  return withoutEmoji.replace(decoration, '').replace(/[\ufe0e\ufe0f]/g, '')
    .replace(/^\s*(?:#{1,6}\s+|[-*•·◦‣]\s+|>\s*)/, '')
    .replace(/\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~/g, (_all, a, b, c) => a || b || c);
}

export function formatLyrics(input: string, options: FormatterOptions = {}): FormattedLyrics {
  const changes: LyricChange[] = [], review: LyricReview[] = [];
  if (input.length > 100000) return {text:'',changes,review,slides:0,error:'O texto está muito longo. Divida em partes para formatar.'};
  const config = {linesPerSlide:2,removeSymbols:true,removeSections:true,removeCredits:true,removeChords:true,
    firstLineIsTitle:true,uppercaseTitle:true,...options};
  const original = input.replace(/\r\n?|[\u2028\u2029]/g, '\n').split('\n');
  const cleaned: string[] = [];
  original.forEach((before, index) => {
    const line = index + 1;
    let text = before.normalize('NFC').replace(invisible, '').trim();
    const reasons: string[] = [];
    if (text !== before.trim()) reasons.push('Caracteres invisíveis ou normalização');
    text = text.replace(/[ \t]+/g, ' ');
    if (config.removeSymbols) {
      const next = cleanSymbols(text).trim();
      if (next !== text) reasons.push('Emojis, símbolos decorativos ou marcação visual');
      text = next;
    }
    text = text.replace(/<\/?(?:b|i|u|font)(?:\s+[^>]*)?>/giu, '');
    if (config.removeSections) {
      const next = text.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, '')
        .replace(/[([{]([^()[\]{}]{1,80})[)\]}]/g, (all, inner) => isMarker(inner) ? '' : all)
        .replace(/\s+(?:\d{1,2}\s*[x×]|[x×]\s*\d{1,2})\s*$/iu, '').trim();
      if (next !== text) reasons.push('Marcador de seção, repetição ou tempo');
      text = next;
      if (isMarker(text) || /^\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\s*-->/.test(text) || /^```(?:text|txt|plaintext|lyrics)?$/i.test(text)) {
        text = ''; reasons.push('Linha de seção ou formatação');
      }
    }
    if (config.removeCredits && (metadata.test(unwrap(text)) || /^https?:\/\/\S+$/i.test(text) || /^\[(?:ar|al|by|offset):.*\]$/i.test(text))) {
      text = ''; reasons.push('Crédito ou metadado identificado');
    }
    if (config.removeChords && chordLine(text)) {text = ''; reasons.push('Linha composta por cifras');}
    text = text.replace(/[ \t]+/g, ' ').trim();
    const override = config.overrides?.[line];
    const proposed = text;
    if (override === 'remove') {text = ''; reasons.push('Remoção manual');}
    if (override === 'keep') text = before.trim();
    if (proposed !== before.trim() || override === 'remove') changes.push({line,before,after:override === 'remove' ? '' : proposed,
      reason:reasons.join('; ') || 'Espaçamento ou marcação de texto',kept:override==='keep'});
    if (/^[([{].+[)\]}]$/.test(text) && !isMarker(text)) {
      review.push({line,text,reason:'Conteúdo entre parênteses ou colchetes mantido. Pode ser parte da letra; revise antes de remover.'});
    }
    // Removed markers preserve stanza boundaries, rather than joining unrelated paragraphs.
    cleaned.push(text);
  });
  while(cleaned[0]==='') cleaned.shift();
  while(cleaned.length && cleaned.at(-1)==='') cleaned.pop();
  if(!cleaned.length) return {text:'',changes,review,slides:0};
  const slides: string[] = [];
  if(config.firstLineIsTitle) {
    const title = cleaned.shift()!;
    slides.push(config.uppercaseTitle ? title.toLocaleUpperCase('pt-BR') : title);
  }
  const limit = [0,2,3,4].includes(config.linesPerSlide) ? config.linesPerSlide : 2;
  let block: string[] = [];
  const flush = () => {if(block.length){slides.push(block.join('\n'));block=[];}};
  for(const line of cleaned) {
    if(!line) {flush();continue;}
    block.push(line);
    if(limit && block.length===limit) flush();
  }
  flush();
  return {text:slides.join('\n\n'),changes,review,slides:slides.length};
}
