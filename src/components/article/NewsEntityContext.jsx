import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { entityTextParts, safeEntityPath } from '../../lib/newsEntityLinks.js';
import '../../styles/newsEntityLinks.css';
const Context = createContext(null);

export function NewsEntityProvider({ article, enabled = true, children }) {
  const [loaded, setLoaded] = useState(null);
  const slug = article?.slug, id = article?.id;
  useEffect(() => {
    if (!enabled || article?.sport !== 'football' || !id || !/^[a-z0-9][a-z0-9-]{0,220}$/.test(slug || '')) return undefined;
    let active = true, pending = false, settled = false, attempts = 0;
    let controller, timer, retryTimer;
    async function load() {
      if (!active || pending || settled || attempts >= 2 || navigator.onLine === false) return;
      pending = true; attempts++;
      controller = new AbortController();
      const current = controller;
      timer = setTimeout(() => current.abort(), 60000);
      try {
        const response = await fetch(`/news-data/football/articles/${encodeURIComponent(slug)}/context`,
          { signal: current.signal, credentials: 'omit' });
        if (!response.ok) throw Object.assign(new Error('Context unavailable'), { status: response.status });
        const data = await response.json();
        if (data.slug !== slug || String(data.article_id) !== String(id) || data.sport !== 'football'
            || !Array.isArray(data.teams) || !Array.isArray(data.players) || !Array.isArray(data.matches)) {
          settled = true; return;
        }
        if (active && !current.signal.aborted) { setLoaded(data); settled = true; }
      } catch (error) {
        if (error.status && ![408,502,503,504].includes(error.status)) settled = true;
        if (active && !settled && attempts < 2) retryTimer = setTimeout(load, 1500);
      } finally { clearTimeout(timer); pending = false; }
    }
    load();
    window.addEventListener('online', load);
    return () => { active = false; controller?.abort(); clearTimeout(timer); clearTimeout(retryTimer); window.removeEventListener('online', load); };
  }, [slug, id, article?.sport, enabled]);
  const data = loaded?.slug === slug && String(loaded?.article_id) === String(id) ? loaded : null;
  const value = useMemo(() => data ? { ...data, entities: [...data.teams, ...data.players].slice(0,40) } : null, [data]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function NewsEntityText({ text }) {
  const data = useContext(Context);
  const parts = useMemo(() => entityTextParts(text, data?.entities), [text, data]);
  return <>{parts.map((part,index) => part.entity
    ? <Link key={index} className="news-entity-link" to={part.entity.href} title={`View ${part.entity.kind}: ${part.entity.name}`}>{part.text}</Link>
    : <React.Fragment key={index}>{part.text}</React.Fragment>)}</>;
}
function Entity({ entry }) {
  if (!safeEntityPath(entry?.href)) return null;
  return <Link to={entry.href} className="news-entity-chip" aria-label={`View ${entry.kind}: ${entry.name}`}>
    <span>{entry.name}</span>
  </Link>;
}
export function NewsArticleLinks() {
  const data = useContext(Context);
  if (!data || (!data.entities.length && !data.matches.length)) return null;
  return <section className="news-article-links" aria-label="People teams and matches in this article">
    {data.teams.length > 0 ? <div><h2>Teams in this story</h2><div className="news-entity-links">{data.teams.map(entry => <Entity key={entry.id} entry={entry} />)}</div></div> : null}
    {data.players.length > 0 ? <div><h2>Players in this story</h2><div className="news-entity-links">{data.players.map(entry => <Entity key={entry.id} entry={entry} />)}</div></div> : null}
    {data.matches.length > 0 ? <div><h2>Related matches</h2><p className="news-entity-note">Matches involving teams mentioned in this article.</p>
      <div className="news-related-matches">{data.matches.filter(entry => safeEntityPath(entry.href)).map(entry => <Link to={entry.href} key={entry.id}>
        <span>{entry.name}</span><small>{entry.competition} · <time dateTime={entry.start_time}>{new Date(entry.start_time).toLocaleDateString('en-GB')}</time></small>
      </Link>)}</div></div> : null}
  </section>;
}
