import React, { useEffect, useRef, useState } from 'react';
import './NewsRefreshBar.css';

/** Refresh only an open News view. Does not run a writer or fetch sporting data. */
export default function NewsRefreshBar({ onRefresh, checkedAt, enabled = true, busy = false }) {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const connected = () => setOnline(true), disconnected = () => setOnline(false);
    window.addEventListener('online', connected); window.addEventListener('offline', disconnected);
    return () => { window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); };
  }, []);
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
  if (!enabled) return null;
  return <div className="news-refresh-bar" aria-label="Published news updates">
    <p role={online ? undefined : "status"}>{online ? "Published news · updates automatically" : "Offline — showing saved news. Reconnect to check for updates."}{online && checkedAt ? <span> · Checked <time dateTime={checkedAt}>{new Date(checkedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time></span> : null}</p>
    <button type="button" className="btn btn-ghost" disabled={busy || !online} onClick={onRefresh}>Refresh news</button>
  </div>;
}
