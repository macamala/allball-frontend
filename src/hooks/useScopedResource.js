import { useCallback, useEffect, useRef, useState } from 'react';
import { getJSON } from '../api.js';
import useVisiblePoll from './useVisiblePoll.js';
/** Each route visit owns its responses, including A -> B -> A. */
export default function useScopedResource(path, interval = 30000) {
  const [state, setState] = useState({ key: '', data: null, loading: Boolean(path), error: false });
  const visit = useRef(0), pending = useRef(null);
  const refresh = useCallback(async () => {
    if (!path) return;
    const generation = visit.current;
    if (pending.current === generation) return;
    pending.current = generation;
    try {
      const data = await getJSON(path);
      if (visit.current === generation) setState({ key: path, data, loading: false, error: false });
    } catch {
      if (visit.current === generation) setState(old => ({ key: path, data: old.key === path ? old.data : null, loading: false, error: true }));
    } finally {
      if (pending.current === generation) pending.current = null;
    }
  }, [path]);
  useEffect(() => {
    visit.current += 1; pending.current = null;
    setState({ key: path, data: null, loading: Boolean(path), error: false });
    if (path) refresh();
    return () => { visit.current += 1; pending.current = null; };
  }, [path, refresh]);
  useVisiblePoll(refresh, path ? interval : null, Boolean(path));
  return { ...(state.key === path ? state : { data: null, loading: Boolean(path), error: false }), refresh };
}
