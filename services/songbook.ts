import {formatLyrics} from './lyricsFormatter.ts';
import type {FormatterOptions, LyricChange, LyricReview} from './lyricsFormatter.ts';

export interface PreparedSong {title:string; lyrics:string; changes:LyricChange[]; review:LyricReview[];}
const heading = /^\s*(?:[🔴🟠🟡🟢🔵🟣⚫⚪]\s*|#{1,6}\s+|(?:t[ií]tulo|m[uú]sica)\s*:\s*)\S/u;
const nameWord = /^(?:\p{Lu}[\p{L}'’-]+|de|da|do|das|dos|e)$/u;
const devotional = /\b(?:eu|tu|ti|n[oó]s|v[oó]s|meu|minha|teu|tua|nosso|senhor|jesus|cristo|deus|esp[ií]rito|santo|aleluia|am[eé]m|quando|como|n[aã]o|sim)\b/iu;
function authorBelowTitle(value:string):boolean {
  const text=value.replace(/^\s*\(\s*|\s*\)\s*$/g,'').trim();
  const words=text.split(/\s+/);
  return words.length>=2 && words.length<=6 && !devotional.test(text) && words.every(word=>nameWord.test(word));
}

/** Song headers provide context; names elsewhere in the lyrics are never removed by this rule. */
export function prepareSongs(input:string, options:FormatterOptions={}):{songs:PreparedSong[];error?:string} {
  if(input.length>100000)return {songs:[],error:'O texto está muito longo. Cole menos músicas por vez.'};
  const lines=input.replace(/\r\n?|[\u2028\u2029]/g,'\n').split('\n');
  const starts:number[]=[];
  lines.forEach((line,index)=>{
    if(!line.trim())return;
    if(starts.length && !heading.test(line))return;
    const plain=formatLyrics(line,{firstLineIsTitle:false,linesPerSlide:0,removeCredits:false}).text;
    if(!plain)return;
    if(!starts.length || (heading.test(line) && !/^(?:refr[aã]o|trecho|ponte|intro|solo)(?:\s|$)/iu.test(plain)))starts.push(index);
  });
  const songs:PreparedSong[]=[];
  starts.forEach((start,position)=>{
    const end=starts[position+1]??lines.length;
    const chunk=lines.slice(start,end);
    chunk[0]=chunk[0].replace(/^\s*(?:t[ií]tulo|m[uú]sica)\s*:\s*/iu,'');
    const overrides:Record<number,'keep'|'remove'>={};
    for(const [line,action] of Object.entries(options.overrides||{})) {
      const local=Number(line)-start;if(local>0&&local<=chunk.length)overrides[local]=action;
    }
    // Only the dedicated line immediately below a song title can be an unlabelled credit.
    const author=chunk[1] && authorBelowTitle(chunk[1]) ? 2 : undefined;
    if(author && options.removeCredits!==false && overrides[author]===undefined)overrides[author]='remove';
    const result=formatLyrics(chunk.join('\n'),{...options,firstLineIsTitle:true,uppercaseTitle:false,linesPerSlide:0,overrides});
    const split=result.text.indexOf('\n\n');
    const title=split<0?result.text:result.text.slice(0,split);
    const lyrics=split<0?'':result.text.slice(split+2);
    if(!title)return;
    songs.push({title,lyrics,changes:result.changes.map(change=>({...change,line:change.line+start,
      reason:change.line===author && !change.kept ? 'Crédito abaixo do título' : change.reason})),
      review:result.review.map(review=>({...review,line:review.line+start}))});
  });
  return {songs};
}
