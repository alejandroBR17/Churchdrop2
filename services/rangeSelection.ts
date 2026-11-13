/** Add a visible interval without selecting collapsed/paginated items or losing prior picks. */
export function rangeSelection(selected:readonly string[],visible:readonly string[],anchor:string|null,target:string,shift:boolean):string[] {
  const end=visible.indexOf(target);
  if(end<0)return [...selected];
  const start=anchor===null?-1:visible.indexOf(anchor);
  if(!shift||start<0)return selected.includes(target)?selected.filter(id=>id!==target):[...selected,target];
  return [...new Set([...selected,...visible.slice(Math.min(start,end),Math.max(start,end)+1)])];
}
