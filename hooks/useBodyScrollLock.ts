import {useEffect} from 'react';

// Several overlays may overlap during transitions. Restore scrolling only after
// the last one closes, including unmounts caused by logout or session expiry.
let owners = 0;
let previousOverflow = '';
export function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    if (owners++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (--owners === 0) document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}
