import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext.jsx';
import { eventPath } from '../../lib/sportsData.js';
import { mutualSummary, textKey } from '../../lib/competitionHub.js';
import { normalizeAssetUrl } from '../../lib/assetUrls.js';
import '../../styles/competitionHub.css';
export function HistoryRows({ rows, sr = false }) {
  return <ul className="h2h-history-list">{rows.map((r, index) => {
    const date = new Date(r.start_time);
    const body = <><time dateTime={r.start_time}>{Number.isFinite(date.getTime()) ? date.toLocaleDateString(sr ? 'sr-Latn' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</time>
      <span className="h2h-history-pair"><span>{r.home?.name}<b>{r.score?.home ?? '—'}</b></span><span>{r.away?.name}<b>{r.score?.away ?? '—'}</b></span></span>
      {r.outcome ? <span className={`form-result is-${r.outcome}`} title={r.outcome === 'W' ? (sr ? 'Pobeda' : 'Win') : r.outcome === 'L' ? (sr ? 'Poraz' : 'Loss') : (sr ? 'Nerešeno' : 'Draw')}>{sr ? ({ W: 'P', D: 'N', L: 'I' }[r.outcome]) : r.outcome}</span> : <span className="history-league">{r.competition || r.result_type || 'FT'}</span>}</>;
    return <li key={r.id || `${r.start_time}-${index}`}>{r.id ? <Link to={eventPath(r.id)}>{body}</Link> : <div className="h2h-history-record">{body}</div>}</li>;
  })}</ul>;
}
export default function HeadToHeadPanel({ event, h2h = [], form = {} }) {
  const { lang } = useI18n(), sr = lang === 'sr';
  const [venue, setVenue] = useState('all'), [limit, setLimit] = useState(10);
  const records = useMemo(() => h2h.filter(r => venue === 'all' || textKey(r.home?.name) === textKey(event.home?.name)), [h2h, venue, event.home?.name]);
  const stats = mutualSummary(event, records);
  return <div className="football-comparison">
    <section className="h2h-summary-card">
      <p className="hub-eyebrow">{sr ? 'Međusobni učinak' : 'Head-to-head record'}</p>
      <div className="h2h-summary-grid">
        <div className="h2h-summary-team">{event.home?.logo ? <img src={normalizeAssetUrl(event.home.logo)} alt="" /> : null}<h2>{event.home?.name}</h2><strong>{stats.home}</strong><span>{sr ? 'pobeda' : 'wins'}</span></div>
        <div className="h2h-draws"><strong>{stats.draws}</strong><span>{sr ? 'nerešeno' : 'draws'}</span></div>
        <div className="h2h-summary-team">{event.away?.logo ? <img src={normalizeAssetUrl(event.away.logo)} alt="" /> : null}<h2>{event.away?.name}</h2><strong>{stats.away}</strong><span>{sr ? 'pobeda' : 'wins'}</span></div>
      </div>
      <p className="hub-note">{sr ? `${stats.total} potvrđenih prethodnih duela · Golovi ${stats.homeGoals}:${stats.awayGoals}` : `${stats.total} verified prior meetings · Goals ${stats.homeGoals}:${stats.awayGoals}`}</p>
      <p className="hub-note">{sr ? 'Omjer je izračunat iz prikazanih rezultata pre izabrane utakmice, ne iz nepotpune procene ukupne istorije.' : 'Record calculated from the available results before the selected match, not an assumed complete all-time history.'}</p>
    </section>
    <div className="h2h-form-grid">{['home', 'away'].map(side => <section className="h2h-form-card" key={side}><p className="hub-eyebrow">{sr ? 'Poslednji rezultati' : 'Recent form'}</p><h3>{event[side]?.name}</h3>
      {form?.[side]?.results?.length ? <HistoryRows rows={form[side].results} sr={sr} /> : <p className="hub-note">{form?.[side]?.summary || (sr ? 'Prethodni rezultati još nisu dostupni.' : 'Previous results are not available yet.')}</p>}</section>)}</div>
    <section className="h2h-meetings-card"><div className="hub-section-heading"><h3>{sr ? 'Prethodni međusobni dueli' : 'Previous meetings'}</h3><label className="hub-control">{sr ? 'Domaćinstvo' : 'Venue'}<select aria-label="Head-to-head venue" value={venue} onChange={e => { setVenue(e.target.value); setLimit(10); }}><option value="all">{sr ? 'Svi dueli' : 'All meetings'}</option><option value="home">{sr ? `${event.home?.name} kod kuće` : `${event.home?.name} at home`}</option></select></label></div>
      {records.length ? <HistoryRows rows={records.slice(0, limit)} sr={sr} /> : <p className="hub-note">{sr ? 'Nema potvrđenih prethodnih duela za ovaj izbor.' : 'No verified previous meetings for this selection.'}</p>}
      {records.length > limit ? <button className="hub-load-more" onClick={() => setLimit(v => v + 15)}>{sr ? 'Prikaži još' : 'Show more'} ({records.length - limit})</button> : null}
    </section>
  </div>;
}
