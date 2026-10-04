import { useEffect, useRef } from 'react';

/** Refresh only an open News view. Does not run a writer or fetch sporting data. */
export default function NewsAutoRefresh({ onRefresh, enabled = true, busy = false }) {
  const callback = useRef(onRefresh);
  const pending = useRef(busy);
  useEffect(() => { callback.current = onRefresh; pending.current = busy; }, [onRefresh, busy]);
  useEffect(() => {
    if (!enabled) return undefined;
    let last = Date.now();
    const refresh = () => {
      if (navigator.onLine === false || document.visibilityState === 'hidden' || pending.current || Date.now() - last < 15000) return;
      last = Date.now(); callback.current();
    };
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer); document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh);
    };
  }, [enabled]);
  return null;
}
