import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { safeEntityPath } from '../lib/newsEntityLinks.js';
import { setPageSeo } from '../lib/seo.js';
import '../styles/entityProfiles.css';

/** News-only detail view. Existing /players, team and Live Scores pages are unchanged. */
export default function NewsPlayerPage() {
  const { playerKey = '' } = useParams();
  const [search] = useSearchParams();
  const slug = search.get('article') || '';
  const valid = /^[1-9]\d{0,11}$/.test(playerKey) && /^[a-z0-9][a-z0-9-]{0,220}$/.test(slug);
  const [state, setState] = useState({ key: '', data: null, error: false });
  const [retry, setRetry] = useState(0);
  const [failedImage, setFailedImage] = useState('');
  const requestKey = playerKey + ':' + slug;
  const profile = state.key === requestKey ? state.data?.profile : null;
  const pending = valid && state.key !== requestKey;
  const back = /^[a-z0-9][a-z0-9-]{0,220}$/.test(slug) ? '/article/' + slug : '/football';
  useEffect(() => {
    if (!valid) return undefined;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    setState({ key: '', data: null, error: false });
    fetch('/news-data/football/articles/' + slug + '/context', { signal: controller.signal, credentials: 'omit' })
      .then(async response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
      .then(data => {
        if (data.slug !== slug || data.sport !== 'football' || !data.article_id || !Array.isArray(data.players)) throw new Error('Scope');
        const player = data.players.find(p => p.kind === 'player' && String(p.id) === playerKey);
        if (!player?.profile || String(player.profile.id) !== playerKey || player.profile.name !== player.name
            || !Array.isArray(player.profile.fields) || !Array.isArray(player.profile.career)
            || !Number.isFinite(Date.parse(player.profile.checked_at))) throw new Error('Identity');
        if (active) setState({ key: requestKey, data: player, error: false });
      }).catch(() => { if (active) setState({ key: requestKey, data: null, error: true }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [playerKey, slug, valid, requestKey, retry]);
  useEffect(() => {
    setPageSeo({ title: profile ? `${profile.name} | Football News | NinkoSports` : 'Player | Football News | NinkoSports',
      description: 'Source-verified player details connected to a football news article.',
      path: window.location.pathname + window.location.search, noindex: true });
  }, [profile]);
  if (pending) return <div className="entity-page news-player-profile"><Link className="entity-back" to={back}>← Back to article</Link><p role="status">Loading player details…</p></div>;
  if (!profile) return <div className="entity-page news-player-profile"><Link className="entity-back" to={back}>← Back to article</Link><section className="entity-card"><h1>Player details</h1><p role="alert">Verified details for this player and article are temporarily unavailable.</p>{valid ? <button className="btn btn-ghost" onClick={() => setRetry(n => n + 1)}>Try again</button> : null}</section></div>;
  const photo = typeof profile.photo === 'string' && /^https:\/\/images\.fotmob\.com\/image_resources\/playerimages\/[1-9]\d*\.png$/.test(profile.photo) ? profile.photo : null;
  const teamHref = safeEntityPath(profile.team?.href) ? profile.team.href : null;
  const stats = Array.isArray(profile.competition?.stats) ? profile.competition.stats : [];
  return <div className="entity-page news-player-profile">
    <Link className="entity-back" to={back}>← Back to article</Link>
    <header className="entity-hero">
      {photo && failedImage !== photo ? <img className="entity-profile-logo is-player" src={photo} alt={profile.name} loading="eager" onError={() => setFailedImage(photo)} /> : null}
      <div><p className="kicker">Football News · Player</p><h1>{profile.name}</h1>
        {teamHref ? <Link className="player-club-link" to={teamHref}>{profile.team.name}</Link> : <p>{profile.team?.name}</p>}
      </div>
    </header>
    <p className="entity-subline">Player data checked <time dateTime={profile.checked_at}>{new Date(profile.checked_at).toLocaleString('en-GB')}</time>. This is not a change to the article’s publication date.</p>
    <div className="entity-grid"><div>
      {stats.length > 0 ? <section className="entity-card"><div className="entity-card-head"><h2>{profile.competition.name} · {profile.competition.season}</h2></div>
        <p>Recorded competition statistics. Missing values are not counted as zero.</p>
        <dl className="player-season-grid">{stats.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{typeof row.value === 'number' && !Number.isInteger(row.value) ? row.value.toFixed(2) : String(row.value)}</dd></div>)}</dl>
      </section> : null}
      {profile.career.length > 0 ? <section className="entity-card"><div className="entity-card-head"><h2>Career & club moves</h2></div><ol className="player-career">{profile.career.map((row, index) => <li key={`${row.team}-${row.start}-${index}`}>
        <div><strong>{row.team}</strong><small>{row.start} – {row.active ? 'Present' : row.end || 'End date not supplied'}{row.transfer_type ? ` · ${row.transfer_type}` : ''}{row.uncertain ? ' · Provisional data' : ''}</small></div>
        <span>{row.appearances != null ? `${row.appearances} appearances` : ''}{row.goals != null ? ` · ${row.goals} goals` : ''}{row.assists != null ? ` · ${row.assists} assists` : ''}</span>
      </li>)}</ol></section> : null}
    </div><aside><section className="entity-card"><div className="entity-card-head"><h2>Player details</h2></div><dl className="entity-facts">{profile.fields.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{String(row.value)}</dd></div>)}</dl></section>
      <section className="entity-card"><h2>Data record</h2><p>{profile.note}</p><p>Player ID: {profile.id} · {profile.source}</p></section>
    </aside></div>
  </div>;
}
