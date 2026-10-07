/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · bus ساده برای اطلاع تغییرات پرسنل به Auth
 *  تا Auth بدون وابستگی مستقیم به PersonnelContext بفهمد
 *  لیست پرسنل عوض شده (برای self-provisioning).
 * ─────────────────────────────────────────────────────────────
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribePersonnelChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function notifyPersonnelChanged(): void {
  listeners.forEach((fn) => fn());
}