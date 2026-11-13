interface LibrarySyncOptions {
  refresh:()=>Promise<boolean|undefined>;
  blocked:()=>boolean;
  visible:()=>boolean;
  online:()=>boolean;
  window:EventTarget;
  document:EventTarget;
}
/** Metadata only: coalesce foreground events, avoid overlapping reads and back off on failure. */
export function startLibrarySync(options:LibrarySyncOptions):()=>void {
  const interval=20_000,minimumGap=5_000;
  let timer:ReturnType<typeof setTimeout>|undefined;
  let disposed=false,busy=false,failures=0,lastAttempt=Date.now();
  const clear=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}};
  const schedule=(delay:number)=>{
    clear();
    if(!disposed&&options.visible()&&options.online())timer=setTimeout(()=>{timer=undefined;void attempt();},delay);
  };
  const attempt=async()=>{
    if(disposed||busy)return;
    if(!options.visible()||!options.online()){clear();return;}
    if(options.blocked()){schedule(interval);return;}
    const remaining=minimumGap-(Date.now()-lastAttempt);
    if(remaining>0){schedule(remaining);return;}
    busy=true;lastAttempt=Date.now();clear();
    try {
      const result=await options.refresh();
      if(result===true)failures=0;
      else if(result===false)failures=Math.min(3,failures+1);
    } catch {failures=Math.min(3,failures+1);}
    finally {busy=false;schedule(Math.min(120_000,interval*2**failures));}
  };
  const wake=()=>{clear();void attempt();};
  const visibility=()=>{if(options.visible())wake();else clear();};
  const offline=()=>clear();
  options.window.addEventListener('focus',wake);
  options.window.addEventListener('online',wake);
  options.window.addEventListener('offline',offline);
  options.document.addEventListener('visibilitychange',visibility);
  schedule(interval);
  return ()=>{
    disposed=true;clear();
    options.window.removeEventListener('focus',wake);
    options.window.removeEventListener('online',wake);
    options.window.removeEventListener('offline',offline);
    options.document.removeEventListener('visibilitychange',visibility);
  };
}
