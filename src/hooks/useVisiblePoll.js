import { useEffect } from "react";

export default function useVisiblePoll(callback, delayMs) {
  useEffect(() => {
    if (delayMs == null || delayMs <= 0) return undefined;
    let timer = 0;

    function tick() {
      if (typeof document !== "undefined" && document.hidden) return;
      callback();
    }

    function onVisibility() {
      if (typeof document !== "undefined" && !document.hidden) callback();
    }

    timer = window.setInterval(tick, delayMs);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [callback, delayMs]);
}
