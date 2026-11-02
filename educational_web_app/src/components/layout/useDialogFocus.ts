/** Keep keyboard focus inside an open drawer and return it to its trigger. */
import { useEffect, useRef } from 'react';

export function useDialogFocus(onClose: () => void, initialSelector = 'button') {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    root?.querySelector<HTMLElement>(initialSelector)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !root) return;
      const focusable = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus(); };
  }, [initialSelector, onClose]);
  return ref;
}
