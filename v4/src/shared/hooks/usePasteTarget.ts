import { useEffect, useState } from 'react';

/**
 * One-at-a-time "paste target" coordination used by multiple dropzones on
 * the same page (X-ray + lab upload).
 *
 *  - Click a dropzone to "arm" it → that zone is highlighted
 *  - Ctrl/Cmd+V while armed → image is handed to that zone's handler
 *  - Any mousedown elsewhere (outside the zone) disarms it
 *
 * Returns `{ armed, wrapperProps }`. Spread `wrapperProps` onto the clickable
 * container; `armed` tells the caller whether to render its highlight style.
 */
const armedKeyAtom: { current: symbol | null } = { current: null };
const listeners = new Set<() => void>();

function setArmed(next: symbol | null) {
  if (armedKeyAtom.current === next) return;
  armedKeyAtom.current = next;
  listeners.forEach((l) => l());
}

function useArmedSnapshot() {
  const [v, setV] = useState(armedKeyAtom.current);
  useEffect(() => {
    const sub = () => setV(armedKeyAtom.current);
    listeners.add(sub);
    return () => {
      listeners.delete(sub);
    };
  }, []);
  return v;
}

export interface PasteTargetOptions {
  /** Called with the pasted image/pdf when the user Ctrl/Cmd+Vs while armed. */
  onPaste: (file: File) => void;
  /** Optional MIME prefix filter. Default: image + pdf. */
  accept?: (type: string) => boolean;
}

export function usePasteTarget({ onPaste, accept }: PasteTargetOptions) {
  const [key] = useState(() => Symbol('paste-target'));
  const armedKey = useArmedSnapshot();
  const armed = armedKey === key;

  // Global paste listener — only the armed target reacts.
  useEffect(() => {
    if (!armed) return;
    const h = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const check =
        accept ??
        ((t: string) => t.startsWith('image/') || t === 'application/pdf');
      const file = items.find((i) => check(i.type))?.getAsFile();
      if (file) {
        e.preventDefault();
        onPaste(file);
      }
    };
    window.addEventListener('paste', h);
    return () => window.removeEventListener('paste', h);
  }, [armed, onPaste, accept]);

  // Disarm on any click outside.
  useEffect(() => {
    if (!armed) return;
    const h = (e: MouseEvent) => {
      const el = document.querySelector(`[data-paste-target="${String(key.description)}"]`);
      if (el && el.contains(e.target as Node)) return;
      setArmed(null);
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [armed, key]);

  const wrapperProps = {
    'data-paste-target': String(key.description),
    onClickCapture: (e: React.MouseEvent) => {
      // Stop other handlers only when arming so existing click behaviors on
      // the inner elements still fire (file picker etc.).
      void e;
      setArmed(key);
    },
  };

  return { armed, wrapperProps };
}
