import type {MediaItem} from '../types.ts';

const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
/** Same publication day on the phone and PC, including near midnight. */
export function uploadDay(date: Date): string {
  const values = Object.fromEntries(parts.formatToParts(date).map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export function libraryDays(items: readonly MediaItem[]): {key:string; label:string; count:number}[] {
  const counts = new Map<string,number>();
  for(const item of items) {const key=uploadDay(item.date); counts.set(key,(counts.get(key)||0)+1);}
  return Array.from(counts,([key,count])=>({key,count,label:key.split('-').reverse().join('/')})).sort((a,b)=>b.key.localeCompare(a.key));
}
