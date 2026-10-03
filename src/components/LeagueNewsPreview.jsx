import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArticles } from '../api.js';
import { leagueNewsRows } from '../config/newsFootball.js';
import { publishedNewsRows, newsTimestamp } from '../lib/newsFreshness.js';
import { isPremiumArticle } from '../lib/quality.js';

// All league reads share this four-request pool. Offscreen leagues do not fetch.
const waiting = [];
let activeReads = 0;
function drain() {
  while (activeReads < 4 && waiting.length) {
    const task = waiting.shift();
    if (!task.alive()) { task.resolve(null); continue; }
    activeReads += 1;
    Promise.resolve().then(task.read).then(task.resolve, task.reject).finally(() => { activeReads -= 1; drain(); });
  }
}
function limited(read, alive) {
  return new Promise((resolve, reject) => { waiting.push({ read, alive, resolve, reject }); drain(); });
}

export default function LeagueNewsPreview({ league, revision = 0 }) {
  const node = useRef(null);
  const [visible, setVisible] = useState(false);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ league, rows: [], loaded: false, error: false });
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setVisible(true);
    }, { rootMargin: '300px' });
    if (node.current) observer.observe(node.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    limited(() => getArticles({ sport: 'football', league, limit: 2 }), () => alive)
      .then(rows => {
        if (!alive || rows === null) return;
        if (!Array.isArray(rows)) throw new Error('Invalid published News response');
        setState({ league, rows: publishedNewsRows(leagueNewsRows(rows, league)).filter(isPremiumArticle).filter(row => row.slug && row.title), loaded: true, error: false });
      })
      .catch(() => { if (alive) setState(old => ({ ...old, league, loaded: true, error: true })); });
    return () => { alive = false; };
  }, [league, visible, revision, retry]);
  const rows = state.league === league ? state.rows : [];
  return <div ref={node} className="news-directory-preview" data-news-league={league}>
    {!visible || !state.loaded ? <p className="news-directory-state">Loading latest published news…</p> : null}
    {rows.map(row => <Link className="news-directory-story" key={row.id || row.slug} to={`/article/${encodeURIComponent(row.slug)}`}>
      {row.image_url ? <img src={row.image_url} alt="" width="68" height="48" loading="lazy" decoding="async" /> : null}
      <span><strong>{row.title}</strong><time dateTime={newsTimestamp(row.published_at || row.created_at)}>{new Date(newsTimestamp(row.published_at || row.created_at)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time></span>
    </Link>)}
    {state.loaded && !state.error && !rows.length ? <p className="news-directory-state">No published story yet.</p> : null}
    {state.error ? <p className="news-directory-state">News could not be refreshed. <button type="button" onClick={() => setRetry(value => value + 1)}>Retry news</button></p> : null}
  </div>;
}
