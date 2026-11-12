/** Small files share metadata latency; large transfers keep the connection to themselves. */
export const SMALL_UPLOAD_LIMIT = 8 * 1024 * 1024;
export async function runUploadQueue<T extends {size:number}>(
  files:readonly T[], upload:(file:T,index:number)=>Promise<void>, signal?:AbortSignal,
):Promise<{completed:Set<T>; error?:unknown}> {
  const completed=new Set<T>();
  let error:unknown;
  let failed=false;
  for(let index=0;index<files.length&&!failed&&!signal?.aborted;) {
    const start=index++;
    if(files[start].size<=SMALL_UPLOAD_LIMIT && index<files.length && files[index].size<=SMALL_UPLOAD_LIMIT)index++;
    await Promise.all(files.slice(start,index).map(async(file,offset)=>{
      if(signal?.aborted)return;
      try {await upload(file,start+offset);completed.add(file);}
      catch(cause){if(!failed)error=cause;failed=true;}
    }));
  }
  return {completed,...(failed?{error}: {})};
}
