import {useEffect,useRef} from 'react';
import {startLibrarySync} from '../services/librarySync';
export function useLibrarySync(refresh:()=>Promise<boolean|undefined>,blocked:()=>boolean) {
  const latest=useRef({refresh,blocked});latest.current={refresh,blocked};
  useEffect(()=>startLibrarySync({
    refresh:()=>latest.current.refresh(),blocked:()=>latest.current.blocked(),
    visible:()=>document.visibilityState==='visible',online:()=>navigator.onLine,
    window,document,
  }),[]);
}
