import { loadNewsSupplement } from '../lib/newsFootballSupplement.js';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getJSON } from '../api.js';
import StandingsTable from './StandingsTable.jsx';
import CountryFlag from './scores/CountryFlag.jsx';
import { normalizeAssetUrl } from '../lib/assetUrls.js';
import { eventPath, teamProfilePath } from '../lib/sportsData.js';
import { FOOTBALL_NEWS_TOPICS, newsDataPath, newsMatches, newsMatchBucket, newsScore, readNewsData, newsDataPhase } from '../lib/newsFootballData.js';
import { peekNewsData, rememberNewsData } from '../lib/newsFootballCache.js';
import { decorateNewsIdentity, newsDateRange, localNewsDate, newsDataNotice, sameNewsSeason, seasonIdentity, newsTeamName } from '../lib/newsFootballView.js';
import '../styles/newsFootballData.css';

function Team({ event, side }) {
  const [failed, setFailed] = useState(false);
  const team = event[side];
  const logo = normalizeAssetUrl(team.logo);
  useEffect(() => setFailed(false), [logo]);
  return <span className="news-data-team">
    {logo && !failed ? <img src={logo} width="24" height="24" loading="lazy" decoding="async" alt="" onError={() => setFailed(true)} />
      : <span className="news-data-crest-space" data-asset-missing="team-logo" aria-hidden="true" />}
    {team.id && event.competition_key ? <Link to={teamProfilePath(team,event)} title={`View team: ${team.name}`}>{team.name}</Link> : <span>{team.name}</span>}<b>{newsScore(event, side)}</b>
  </span>;
}

function Match({ event }) {
  const displayDate = event.start_precision === 'DATE_ONLY' && event.source_date ? new Date(...event.source_date.split('-').map((v,i)=>Number(v)-(i===1?1:0))) : new Date(event.start_time);
  const at = new Date(event.start_time), bucket = newsMatchBucket(event);
  const label = bucket === 'results' ? 'FT' : bucket === 'other' ? (['live', 'in_progress', 'halftime', 'break'].includes(event.status) ? 'Awaiting confirmation' : String(event.status || 'Awaiting confirmation').replaceAll('_', ' '))
    : ['live', 'in_progress', 'halftime', 'break'].includes(event.status) ? 'In progress'
    : event.start_precision && event.start_precision !== 'EXACT_TIME' ? 'Time TBC'
    : at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const teams = <><Team event={event} side="home" /><Team event={event} side="away" /></>;
  const detailAvailable = event.id && event.details_available !== false;
  const meta = <><time dateTime={event.start_time}>{displayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</time><strong>{label}</strong></>;
  return <li className="news-data-match" data-match-key={event.key || event.id}>
    <div className="news-data-match-time">{detailAvailable ? <Link to={eventPath(event.id)} state={{ event }} aria-label={`Open match: ${event.home.name} vs ${event.away.name}`}>{meta}</Link> : meta}
      {event.round ? <small>{/^(?:round|matchday|week|leg)\b/i.test(String(event.round)) ? event.round : `Round ${event.round}`}</small> : null}{event.group ? <small>{event.group}</small> : null}</div>
    <div className="news-data-pair">{teams}</div>
  </li>;
}

/** Lazy, cancellable read-only tab. Never starts or changes a results worker. */
export default function FootballNewsData({ competition, label, view }) {
  const [season, setSeason] = useState('');
  const [dateFrom, setDateFrom] = useState(() => localNewsDate());
  const [dateTo, setDateTo] = useState(() => localNewsDate());
  const [range, setRange] = useState(null);
  const [dateError, setDateError] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const identityReference = useRef(null);
  const [knownSeasons, setKnownSeasons] = useState([]);
  const [group, setGroup] = useState('');
  const [team, setTeam] = useState('');
  const [visible, setVisible] = useState(40);
  const [retry, setRetry] = useState(0);
  const [resource, setResource] = useState({ path: '', data: null, loading: true, error: '' });
  const basePath = newsDataPath(competition, view, season);
  const scope = view === 'standings' ? '' : range?.key || '';
  const path = basePath ? `${basePath}|${scope}` : null;
  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    let active = true, pending = false;
    const cached = peekNewsData(competition, view, season, Date.now(), scope);
    function accept(data, savedAt = Date.now()) {
      setKnownSeasons(previous => [...new Set([...previous, ...(Array.isArray(data.seasons) ? data.seasons : []), data.season, ...(data.events || []).map(row => row.season)].filter(value => typeof value === 'string' && value))].sort().reverse());
      setResource({ path, data, savedAt, loading: false, refreshing: false, error: '' });
    }
    if (cached) accept(cached.data, cached.savedAt);
    else setResource({ path, data: null, loading: true, refreshing: false, error: '' });
    async function load(force = false) {
      if (pending || !active) return;
      // Fixtures and Results share the same verified payload. Switching tabs
      // should not discard it or send an identical public request immediately.
      const saved = peekNewsData(competition, view, season, Date.now(), scope);
      if (!force && saved?.fresh) { accept(saved.data, saved.savedAt); return; }
      pending = true;
      setResource(previous => ({ ...previous, refreshing: true }));
      try {
        const data = await readNewsData(getJSON, competition, view, { season, range: view === 'standings' ? null : range, signal: controller.signal, supplement: loadNewsSupplement });
        if (!data || (season && data.season && !sameNewsSeason(data.season, season))) throw new Error('Unverified competition or season scope');
        if (data._newsRead?.partial && !(view === 'standings' ? data.rows : data.events)?.length
            && saved?.data && (view === 'standings' ? saved.data.rows : saved.data.events)?.length)
          throw new Error('Incomplete empty response cannot replace retained records');
        if (active && !controller.signal.aborted) {
          rememberNewsData(competition, view, season, data, Date.now(), scope);
          accept(data);
        }
      } catch (error) {
        if (active && error.name !== 'AbortError') {
          const saved = peekNewsData(competition, view, season, Date.now(), scope);
          setResource(previous => ({ path,
            data: saved?.data || (previous.path === path ? previous.data : null),
            savedAt: saved?.savedAt || previous.savedAt, loading: false, refreshing: false,
            error: 'This competition’s data could not be refreshed. Please try again.' }));
        }
      } finally { pending = false; }
    }
    load(retry > 0);
    const refresh = () => { if (document.visibilityState !== 'hidden') load(true); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('online', refresh);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener('online', refresh); };
  }, [path, competition, view, season, range, scope, retry]);
  const data = useMemo(() => {
    const raw = resource.path === path ? resource.data : null;
    const saved = peekNewsData(competition, view === 'standings' ? 'fixtures' : 'standings', season);
    if (raw && Array.isArray(raw.teams) && raw.teams.length && raw.teams.length <= 128)
      identityReference.current = { competition: raw.competition, season: raw.season, teams: raw.teams };
    return decorateNewsIdentity(raw, saved?.data || identityReference.current);
  }, [resource, path, competition, view, season]);
  const loading = resource.path !== path || resource.loading;
  const meta = typeof data?.competition === 'object' ? data.competition : {};
  const allEvents = useMemo(() => newsMatches(data, competition, { season, range }), [data, competition, season, range]);
  const matches = useMemo(() => newsMatches(data, competition, { view, season, group, team, range }), [data, competition, view, season, group, team, range]);
  const others = useMemo(() => newsMatches(data, competition, { view: 'other', season, group, team, range }), [data, competition, season, group, team, range]);
  const table = Array.isArray(data?.rows) ? data.rows : [];
  const seasons = [...new Set(knownSeasons.map(seasonIdentity))].sort().reverse();
  const groups = [...new Set(allEvents.map(row => row.group).filter(Boolean))].sort();
  const teams = [...new Map(allEvents.flatMap(row => [row.home.name, row.away.name]).map(name => [newsTeamName(name), name])).values()].sort();
  const timestamp = view === 'standings' ? data?.updated_at : data?.checked_at;
  const checked = timestamp ? new Date(timestamp) : null;
  const stale = data?.stale || data?.coverage?.stale || Boolean(resource.error && data);
  const notice = newsDataNotice(data, view);
  useEffect(() => setLogoFailed(false), [meta.logo]);
  const showList = rows => <ul className="news-data-list">{rows.map(event => <Match key={event.key || event.id} event={event} />)}</ul>;
  const resetFilters = () => { setGroup(''); setTeam(''); setVisible(40); };
  function applyRange(event) {
    event.preventDefault();
    try { setRange(newsDateRange(dateFrom, dateTo)); setDateError(''); resetFilters(); }
    catch (error) { setDateError(error.message); }
  }
  function todayRange() {
    const today = localNewsDate(); setDateFrom(today); setDateTo(today);
    setRange(newsDateRange(today, today)); setDateError(''); resetFilters();
  }
  if (FOOTBALL_NEWS_TOPICS.has(competition)) return <section className="news-football-data"><h2>{label}</h2><p>This is a news topic covering multiple competitions. Choose an individual competition above for its fixtures, results and standings.</p></section>;
  return <section className="news-football-data" aria-label={`${label} ${view}`} aria-busy={loading}>
    <header className="news-data-heading"><div>{meta.logo && !logoFailed ? <img className="news-data-competition-logo" src={normalizeAssetUrl(meta.logo)} width="32" height="32" alt="" onError={() => setLogoFailed(true)} /> : null}{meta.country_id ? <CountryFlag countryId={meta.country_id} /> : null}<h2>{label} · {view[0].toUpperCase() + view.slice(1)}</h2></div>
      <div className="news-data-tools">{seasons.length > 0 ? <label>Season<select aria-label="News data season" value={season} onChange={event => { setSeason(event.target.value); resetFilters(); }}><option value="">All available seasons</option>{seasons.map(value => <option key={value} value={value}>{value}</option>)}</select></label> : data?.season ? <span>Season {data.season}</span> : null}
      <button className="btn btn-ghost" type="button" disabled={loading || resource.refreshing} onClick={() => setRetry(value => value + 1)}>Refresh data</button></div>
    </header>
    {newsDataPhase(data, competition) ? <p className="news-data-note">Competition phase: {newsDataPhase(data, competition)}</p> : null}
    {view !== 'standings' ? <form className="news-data-dates" onSubmit={applyRange} aria-label="News match date range">
      <label>From<input aria-label="News matches from" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} required /></label>
      <label>To<input aria-label="News matches to" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} required /></label>
      <button className="btn btn-ghost" type="submit">Apply dates</button>
      <button className="btn btn-ghost" type="button" onClick={todayRange}>Today</button>
      {range ? <button className="btn btn-ghost" type="button" onClick={() => { setRange(null); setDateError(''); resetFilters(); }}>All available dates</button> : null}
      <p className="news-data-date-caption">{range ? `Selected: ${range.dateFrom} to ${range.dateTo}` : 'Showing all available match dates.'} Dates and kick-off times use your local timezone.</p>
    </form> : null}
    {dateError ? <p role="alert">{dateError}</p> : null}
    {data?._newsRead?.edition ? <p className="news-data-note">Tournament edition: {data.season}. {data._newsRead.currentEditionUnavailable ? 'The current edition is unavailable; showing the verified previous edition. ' : ''}{view === 'standings' ? 'Group-stage standings for this edition; not a live knockout bracket.' : 'Fixtures and results reported for this edition.'}</p> : null}
    {data?.table_status === 'provisional' ? <p className="news-data-note">Provisional official standings · Season {data.season}</p> : null}
    {notice ? <p className="news-data-notice" role="note">{notice}</p> : null}
    {season && view !== 'standings' ? <p className="news-data-note">Only records explicitly labelled with season {season} are included. Records without a confirmed season remain under All available seasons.</p> : null}
    {loading ? <p role="status">Loading {view}…</p> : resource.refreshing ? <p role="status">Refreshing {view}…</p> : null}
    {resource.path === path && resource.error ? <p role="alert">{resource.error} {data ? 'Showing the last successfully loaded records.' : ''}</p> : null}
    {!loading && view === 'standings' && table.length > 0 ? <StandingsTable teamLinks={!data?._newsRead?.supplementary} key={`${competition}:${season}:${group}`} sport="football" competition={competition} competitionCountry={meta.country_id} rows={table} event={{ group }} strictGroup onGroupChange={setGroup} /> : null}
    {!loading && view !== 'standings' && allEvents.length > 0 ? <>
      <div className="news-data-filters"><label>Team<select aria-label="News data team" value={team} onChange={event => { setTeam(event.target.value); setVisible(40); }}><option value="">All teams</option>{teams.map(value => <option key={value}>{value}</option>)}</select></label>
      {groups.length > 1 ? <label>Group<select aria-label="News data group" value={group} onChange={event => { setGroup(event.target.value); setVisible(40); }}><option value="">All groups</option>{groups.map(value => <option key={value}>{value}</option>)}</select></label> : null}</div>
      {matches.length > 0 ? <><p>{matches.length} available {view} · Kick-off times are shown in your local time.</p>{showList(matches.slice(0, visible))}{matches.length > visible ? <button type="button" className="btn btn-ghost" onClick={() => setVisible(value => value + 40)}>Show more matches</button> : null}</> : null}
      {view === 'fixtures' && others.length > 0 ? <details><summary>Postponed, cancelled or awaiting confirmation ({others.length})</summary>{showList(others.slice(0, visible))}</details> : null}
    </> : null}
    {!loading && !resource.error && !(view === 'standings' ? table.length : matches.length) ? <div className="news-data-empty"><h3>No confirmed {view} available for this selection</h3><p>{view === 'standings' ? 'Some cups and knockout rounds do not have a league table. A table will appear here when verified standings are available.' : 'Only verified records belonging to this competition and season are shown. New records appear automatically when available.'}</p></div> : null}
    {checked && Number.isFinite(checked.getTime()) ? <p className="news-data-note">{stale ? 'Last saved data' : 'Last checked'}: <time dateTime={timestamp}>{checked.toLocaleString('en-GB')}</time>. These tabs refresh automatically while open.</p> : null}
  </section>;
}
