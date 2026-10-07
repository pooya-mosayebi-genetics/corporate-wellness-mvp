/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · bus ساده برای اطلاع تغییرات صف sync
 * ─────────────────────────────────────────────────────────────
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeSyncChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function notifySyncChanged(): void {
  listeners.forEach((fn) => fn());
}