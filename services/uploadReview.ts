import type {MediaItem} from '../types.ts';
export interface FileMetadata {name:string;size:number;}
export type DuplicateWarning = 'selection'|'library-exact'|'library-name';
const normalized=(name:string)=>name.normalize('NFC').trim().toLocaleLowerCase('pt-BR');
/** Metadata warnings only: equal names/sizes do not prove identical contents. */
export function duplicateWarnings(files:readonly FileMetadata[],library:readonly Pick<MediaItem,'name'|'sizeBytes'>[]):Map<number,DuplicateWarning>{
  const result=new Map<number,DuplicateWarning>();
  const queued=new Map<string,number[]>();
  const existing=new Map<string,Set<number|undefined>>();
  for(const item of library){const name=normalized(item.name),sizes=existing.get(name)||new Set<number|undefined>();sizes.add(item.sizeBytes);existing.set(name,sizes);}
  files.forEach((file,index)=>{
    const name=normalized(file.name),key=`${name}\n${file.size}`;
    queued.set(key,[...(queued.get(key)||[]),index]);
    const sizes=existing.get(name);
    if(sizes)result.set(index,sizes.has(file.size)?'library-exact':'library-name');
  });
  for(const indexes of queued.values())if(indexes.length>1)for(const index of indexes)if(!result.has(index))result.set(index,'selection');
  return result;
}
export type UploadOutcome = 'complete'|'waiting'|'paused'|'failed'|'publication-pending';
export function interruptedOutcome(phase:string|undefined,paused:boolean):UploadOutcome{
  return phase==='publishing'||phase==='complete'?'publication-pending':paused?'paused':'failed';
}
