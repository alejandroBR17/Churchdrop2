import {useEffect, useRef} from 'react';

const dialogs: Array<{close: () => void}> = [];
function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const dialog = dialogs[dialogs.length - 1];
  if (!dialog) return;
  event.preventDefault();
  dialog.close();
}

// Only the most recently opened dialog handles Escape. Keep callbacks current
// without changing the dialog order when the parent renders again.
export function useDialogEscape(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const entry = {close: () => close.current()};
    if (!dialogs.length) window.addEventListener('keydown', onKeyDown);
    dialogs.push(entry);
    return () => {
      const index = dialogs.indexOf(entry);
      if (index >= 0) dialogs.splice(index, 1);
      if (!dialogs.length) window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);
}
