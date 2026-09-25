import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext.jsx';
import useScopedResource from '../../hooks/useScopedResource.js';
import { filteredMatches, matchBucket, textKey } from '../../lib/competitionHub.js';
import { eventPath, isConfirmedLive } from '../../lib/sportsData.js';
import { normalizeAssetUrl } from '../../lib/assetUrls.js';
import StandingsTable from '../StandingsTable.jsx';
import HeadToHeadPanel from './HeadToHeadPanel.jsx';
import '../../styles/competitionHub.css';
const TABS = ['standings', 'fixtures', 'results', 'h2h'];
function apiPath(key, suffix, values) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => { if (v) query.set(k, v); });
  return `/sports-data/competitions/${encodeURIComponent(key)}/${suffix}${query.size ? `?${query}` : ''}`;
}
function FixtureRow({ event, onCompare, sr }) {
  const at = new Date(event.start_time), dated = Number.isFinite(at.getTime());
  let status = dated ? at.toLocaleTimeString(sr ? 'sr-Latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
  if (matchBucket(event) === 'results') status = 'FT';
  else if (isConfirmedLive(event)) status = event.score?.minute ? `${event.score.minute}′` : 'LIVE';
  else if (event.status === 'in_progress') status = sr ? 'U toku' : 'In progress';
  else if (['cancelled', 'postponed', 'suspended', 'abandoned'].includes(event.status)) status = event.status;
  const body = ['home', 'away'].map(side => <span key={side} className="hub-fixture-side">{event[side]?.logo ? <img loading="lazy" src={normalizeAssetUrl(event[side].logo)} alt="" /> : <span className="hub-crest-space" />}<span>{event[side]?.name || '—'}</span><b>{event.score?.[side] ?? '—'}</b></span>);
  return <li className={`hub-fixture-row ${isConfirmedLive(event) ? 'is-live' : ''}`} data-match-key={event.key}>
    <div className="hub-fixture-time"><time dateTime={event.start_time}>{dated ? at.toLocaleDateString(sr ? 'sr-Latn' : 'en-GB', { day: '2-digit', month: 'short' }) : '—'}</time><strong>{status}</strong>{event.round ? <small>{sr ? 'Kolo' : 'Round'} {event.round}</small> : null}</div>
    {event.id ? <Link className="hub-fixture-pair" to={eventPath(event.id)} state={{ event }} aria-label={`${sr ? 'Otvori meč' : 'Open match'}: ${event.home?.name} vs ${event.away?.name}`}>{body}</Link> : <div className="hub-fixture-pair">{body}</div>}
    <button className="hub-compare-button" type="button" onClick={() => onCompare(event)} aria-label={`H2H: ${event.home?.name} vs ${event.away?.name}`}>H2H <span aria-hidden="true">↔</span></button>
  </li>;
}
export default function CompetitionHubPanels({ competitionKey, sport, group, season, meta, children }) {
  const { lang } = useI18n(), sr = lang === 'sr';
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab'), tab = TABS.includes(rawTab) ? rawTab : 'standings';
  const team = params.get('team') || '', round = params.get('round') || '', match = params.get('match') || '';
  const venue = ['home', 'away'].includes(params.get('venue')) ? params.get('venue') : 'all';
  const resource = useScopedResource(sport === 'football' ? apiPath(competitionKey, 'hub', { group, season }) : null);
  const comparison = useScopedResource(sport === 'football' && tab === 'h2h' && match ? apiPath(competitionKey, 'comparison', { match, group, season }) : null, 300000);
  const [visible, setVisible] = useState(30);
  const data = resource.data, events = data?.events || [];
  const change = (values) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    setVisible(30); setParams(next);
  };
  const compare = event => change({ tab: 'h2h', match: event.key });
  const upcoming = useMemo(() => filteredMatches(events, { view: 'fixtures', team, round }), [events, team, round]);
  const results = useMemo(() => filteredMatches(events, { view: 'results', team, round }), [events, team, round]);
  const other = useMemo(() => filteredMatches(events, { view: 'other', team, round }), [events, team, round]);
  const teamOptions = useMemo(() => [...new Set(events.flatMap(e => [e.home?.name, e.away?.name]).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [events]);
  const rounds = useMemo(() => [...new Set(events.map(e => String(e.round || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [events]);
  if (sport !== 'football') return children;
  const labels = sr ? { standings: 'Tabela', fixtures: 'Raspored', results: 'Rezultati', h2h: 'Međusobni' } : { standings: 'Standings', fixtures: 'Fixtures', results: 'Results', h2h: 'Head-to-head' };
  const list = rows => <ul className="hub-fixture-list">{rows.map(event => <FixtureRow key={event.key} event={event} onCompare={compare} sr={sr} />)}</ul>;
  const empty = <p className="hub-empty-message">{resource.loading ? (sr ? 'Učitavanje utakmica…' : 'Loading matches…') : sr ? 'Za ovaj izbor nema potvrđenih utakmica u dostupnim podacima.' : 'No confirmed matches are available for this selection.'}</p>;
  const selected = comparison.data?.event;
  return <div className="competition-hub">
    <nav className="competition-hub-tabs" role="tablist" aria-label={sr ? 'Pregled takmičenja' : 'Competition sections'}>{TABS.map(id => <button key={id} id={`hub-tab-${id}`} role="tab" type="button" aria-selected={tab === id} aria-controls={`hub-panel-${id}`} onClick={() => change({ tab: id === 'standings' ? '' : id })}>{labels[id]}{['fixtures', 'results'].includes(id) && data ? <span>{id === 'fixtures' ? upcoming.length : results.length}</span> : null}</button>)}</nav>
    {resource.error ? <p className="hub-feedback" role="alert">{sr ? 'Utakmice trenutno ne mogu da se osveže.' : 'Match data could not be refreshed.'} <button onClick={resource.refresh}>{sr ? 'Pokušaj ponovo' : 'Try again'}</button></p> : null}
    {tab === 'standings' ? <div role="tabpanel" id="hub-panel-standings" aria-labelledby="hub-tab-standings">
      {data?.table_views?.home?.length && data?.table_views?.away?.length ? <div className="hub-venue-toggle" aria-label={sr ? 'Tabela po domaćinstvu' : 'Table venue'}>{['all', 'home', 'away'].map(v => <button key={v} type="button" aria-pressed={venue === v} onClick={() => change({ venue: v === 'all' ? '' : v })}>{sr ? ({ all: 'Ukupno', home: 'Kod kuće', away: 'U gostima' }[v]) : ({ all: 'Overall', home: 'Home', away: 'Away' }[v])}</button>)}</div> : null}
      {venue !== 'all' && data?.table_views?.[venue]?.length ? <section className="competition-table-card"><StandingsTable rows={data.table_views[venue]} sport="football" competition={competitionKey} competitionCountry={meta.country_id} event={{ group }} strictGroup onGroupChange={g => change({ group: g, match: '', team: '', round: '' })} /></section> : children}
      <div className="hub-preview-grid">{[['fixtures', upcoming], ['results', results]].map(([id, records]) => <section className="hub-match-card" key={id}><div className="hub-section-heading"><h2>{sr ? (id === 'fixtures' ? 'Sledeće utakmice' : 'Poslednji rezultati') : (id === 'fixtures' ? 'Next matches' : 'Latest results')}</h2><button className="hub-text-button" onClick={() => change({ tab: id })}>{sr ? 'Sve' : 'View all'} →</button></div>{records.length ? list(records.slice(0, 3)) : empty}</section>)}</div>
    </div> : tab === 'h2h' ? <div role="tabpanel" id="hub-panel-h2h" aria-labelledby="hub-tab-h2h">
      <section className="hub-match-card"><label className="hub-control hub-match-picker">{sr ? 'Izaberi duel za poređenje' : 'Select a match to compare'}<select aria-label="Compare match" value={match} onChange={e => change({ match: e.target.value })}><option value="">{sr ? 'Izaberi utakmicu…' : 'Choose a match…'}</option>{[...upcoming, ...results].slice(0, 700).map(e => <option key={e.key} value={e.key}>{e.home?.name} — {e.away?.name} · {new Date(e.start_time).toLocaleDateString(sr ? 'sr-Latn' : 'en-GB')}</option>)}</select></label></section>
      {!match ? <p className="hub-empty-message">{sr ? 'Izaberi utakmicu ili pritisni H2H uz bilo koji par u rasporedu i rezultatima.' : 'Choose a match, or use H2H beside a fixture or result.'}</p> : comparison.loading ? <p role="status" className="hub-empty-message">{sr ? 'Učitavanje prethodnih duela…' : 'Loading previous meetings…'}</p> : comparison.error ? <p role="alert" className="hub-empty-message">{sr ? 'Poređenje trenutno nije dostupno.' : 'Comparison could not be loaded.'} <button onClick={comparison.refresh}>{sr ? 'Pokušaj ponovo' : 'Try again'}</button></p> : selected ? <><HeadToHeadPanel key={match} event={selected} h2h={comparison.data.h2h || []} form={comparison.data.form || {}} />{selected.id ? <Link className="hub-match-detail-link" to={eventPath(selected.id)}>{sr ? 'Otvori detalje izabrane utakmice' : 'Open the selected match details'} →</Link> : null}</> : <p className="hub-empty-message">{sr ? 'Ovaj duel nije potvrđen u izabranoj ligi, grupi ili sezoni.' : 'This match is not verified in the selected competition, group or season.'}</p>}
    </div> : <div role="tabpanel" id={`hub-panel-${tab}`} aria-labelledby={`hub-tab-${tab}`} className="hub-match-card">
      <div className="hub-filters"><label className="hub-control">{sr ? 'Ekipa' : 'Team'}<select aria-label="Filter team" value={team} onChange={e => change({ team: e.target.value, match: '' })}><option value="">{sr ? 'Sve ekipe' : 'All teams'}</option>{teamOptions.map(name => <option key={name} value={textKey(name)}>{name}</option>)}</select></label>
      {rounds.length ? <label className="hub-control">{sr ? 'Kolo' : 'Round'}<select aria-label="Filter round" value={round} onChange={e => change({ round: e.target.value })}><option value="">{sr ? 'Sva kola' : 'All rounds'}</option>{rounds.map(r => <option key={r}>{r}</option>)}</select></label> : null}
      {data?.groups?.length > 1 ? <label className="hub-control">{sr ? 'Grupa' : 'Group'}<select aria-label="Fixture group" value={group} onChange={e => change({ group: e.target.value, match: '', team: '', round: '' })}><option value="">{sr ? 'Sve grupe' : 'All groups'}</option>{data.groups.map(g => <option key={g}>{g}</option>)}</select></label> : null}</div>
      <h2>{labels[tab]} <span className="hub-count">{(tab === 'fixtures' ? upcoming : results).length}</span></h2>
      {(tab === 'fixtures' ? upcoming : results).length ? list((tab === 'fixtures' ? upcoming : results).slice(0, visible)) : empty}
      {(tab === 'fixtures' ? upcoming : results).length > visible ? <button className="hub-load-more" onClick={() => setVisible(n => n + 40)}>{sr ? 'Prikaži još utakmica' : 'Show more matches'}</button> : null}
      {tab === 'fixtures' && other.length ? <details className="hub-other"><summary>{sr ? 'Odloženo, otkazano ili čeka potvrdu' : 'Postponed, cancelled or awaiting confirmation'} ({other.length})</summary>{list(other.slice(0, 30))}</details> : null}
    </div>}
    {data ? <p className="hub-coverage-note">{sr ? `${data.coverage?.listed ?? events.length} dostupnih utakmica. Raspored i rezultati se proveravaju automatski; detalje meča otvaraju povezane utakmice, a H2H je dostupan uz svaki prikazani par.` : `${data.coverage?.listed ?? events.length} available matches. Fixtures and results refresh automatically; linked matches open full match details, and H2H is available beside every listed pair.`}{data.coverage?.stale ? (sr ? ' Prikazani su poslednji sačuvani podaci.' : ' Showing the last saved data.') : ''}{data.coverage?.truncated ? (sr ? ' Prikaz je ograničen.' : ' Coverage shown is limited.') : ''}</p> : null}
  </div>;
}
