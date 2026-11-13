/** Apply the clicked checkbox state to a visible interval, preserving picks outside it. */
export function rangeSelection(selected:readonly string[],visible:readonly string[],anchor:string|null,target:string,shift:boolean):string[] {
  const end=visible.indexOf(target);
  if(end<0)return [...selected];
  const start=anchor===null?-1:visible.indexOf(anchor);
  if(!shift||start<0)return selected.includes(target)?selected.filter(id=>id!==target):[...selected,target];
  const range=visible.slice(Math.min(start,end),Math.max(start,end)+1);
  if(selected.includes(target)){const remove=new Set(range);return selected.filter(id=>!remove.has(id));}
  return [...new Set([...selected,...range])];
}
