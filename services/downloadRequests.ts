/** Tab-local request history only. Never implies browser save completion. */
let snapshot:ReadonlySet<string>=new Set();
const listeners=new Set<()=>void>();
export const getDownloadRequests=()=>snapshot;
export function subscribeDownloadRequests(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export function recordDownloadRequest(id:string){
  if(snapshot.has(id))return;
  snapshot=new Set([...snapshot,id]);
  for(const listener of listeners)listener();
}
export function clearDownloadRequests(){
  if(!snapshot.size)return;
  snapshot=new Set();
  for(const listener of listeners)listener();
}
