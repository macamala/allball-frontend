import { sameNewsSeason, newsTeamName } from './newsFootballView.js';
/** News-only presentation of existing, public football records. No ingestion. */
export const FOOTBALL_NEWS_TOPICS = new Set([
  'football-international', 'football-youth', 'football-women', 'football-national-teams',
]);

// Explicit country-qualified equivalences from the public football registry.
// Never resolve a league by substring: Serie B, women's and youth events overlap.
export const NEWS_DATA_ALIASES = {
  'usa-usl-championship': ['usa-usl-championship', 'football-usa-usl-championship'],
  // Public registry, exact team identities and current seasons verified 2026-10-03.
  // Apertura is a named phase, never merged with a different phase's table.
  'mexico-liga-expansion': ['mexico-liga-expansion', 'football-mex-liga-de-expansion-mx-apertura'],
  'uefa-womens-champions-league': ['uefa-womens-champions-league', 'football-women-s-champions-league'],
  'japan-j1-league': ['japan-j1'],
  'south-korea-k-league-1': ['korea-k-league-1'],
  'australia-a-league-men': ['australia-a-league'],
  'usa-mls': ['mls'],
  'argentina-liga-profesional': ['argentina-primera'],
  'hungary-nb-1': ['hungary-nb-i'],
  'romania-liga-1': ['romania-superliga'],
  'conmebol-libertadores': ['copa-libertadores'],
  'conmebol-sudamericana': ['copa-sudamericana'],
  'afc-champions-league-elite': ['afc-champions-league'],
  'england-womens-super-league': ['womens-super-league'],
  'italy-serie-b': ['italy-serie-b', 'football-ita-serie-b'],
  'france-ligue-2': ['france-ligue-2', 'football-fra-ligue-2'],
  'netherlands-eerste-divisie': ['netherlands-eerste-divisie', 'football-ned-eerste-divisie'],
  'belgium-challenger-pro-league': ['belgium-challenger-pro-league', 'football-bel-first-division-b'],
  'scotland-championship': ['scotland-championship', 'football-sco-championship'],
  'portugal-liga-2': ['portugal-liga-2', 'football-por-liga-portugal-2'],
  'turkey-first-league': ['turkey-first-league', 'football-tur-1-lig'],
  'greece-super-league-2': ['greece-super-league-2', 'football-gre-super-league-2'],
  'switzerland-challenge-league': ['switzerland-challenge-league', 'football-sui-challenge-league'],
  'poland-first-league': ['poland-first-league', 'football-pol-i-liga'],
  'czech-second-league': ['czech-second-league', 'football-cze-fnl'],
  'austria-second-league': ['austria-second-league', 'football-aut-2-liga'],
  'denmark-first-division': ['denmark-first-division', 'football-den-1-division'],
  'norway-first-division': ['norway-first-division', 'football-nor-1-divisjon'],
  'sweden-superettan': ['sweden-superettan', 'football-swe-superettan'],
  'finland-ykkosliiga': ['finland-ykkosliiga', 'football-fin-ykk-sliiga'],
  'romania-liga-2': ['romania-liga-2', 'football-rou-liga-ii'],
  'bulgaria-second-league': ['bulgaria-second-league', 'football-bul-second-professional-league'],
  'hungary-nb-2': ['hungary-nb-2', 'football-hun-nb-ii'],
  'brazil-serie-b': ['brazil-serie-b', 'football-bra-s-rie-b'],
  'argentina-primera-nacional': ['argentina-primera-nacional', 'football-arg-primera-nacional'],
  'japan-j2-league': ['japan-j2-league', 'football-jpn-j-league-2'],
  'south-korea-k-league-2': ['south-korea-k-league-2', 'football-kor-k-league-2'],
  'saudi-first-division': ['saudi-first-division', 'football-ksa-saudi-first-division'],
  'turkey-super-lig': ['turkey-super-lig', 'football-tur-super-lig'],
  'greece-super-league': ['greece-super-league', 'football-gre-super-league'],
};
export function newsDataKeys(competition) {
  return !competition || FOOTBALL_NEWS_TOPICS.has(competition) ? [] : NEWS_DATA_ALIASES[competition] || [competition];
}

const FINALS = new Set(['finished', 'complete', 'final', 'ft', 'ended', 'aet', 'pen']);
const ACTIVE = new Set(['live', 'in_progress', 'halftime', 'break']);
const SCHEDULED = new Set(['scheduled', 'upcoming', 'not_started']);

export function newsDataPath(competition, view, season = '', dataKey = '') {
  if (!competition || FOOTBALL_NEWS_TOPICS.has(competition)) return null;
  competition = dataKey || newsDataKeys(competition)[0];
  const query = new URLSearchParams();
  if (view === 'standings') query.set('league', competition);
  if (season) query.set('season', season);
  const path = view === 'standings' ? '/sports-data/standings'
    : `/sports-data/competitions/${encodeURIComponent(competition)}/hub`;
  return `${path}${query.size ? `?${query}` : ''}`;
}

export function scopedNewsData(payload, competition) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const meta = payload.competition;
  const key = typeof meta === 'string' ? meta : meta?.id || meta?.competition_id;
  const sport = typeof meta === 'object' ? meta?.sport || meta?.sport_id : payload.sport;
  // A response from another competition or sport must never populate this menu.
  if (!newsDataKeys(competition).includes(key) || (sport && sport !== 'football') || (payload.sport && payload.sport !== 'football')) return null;
  return payload;
}

export function newsMatchBucket(event, now = Date.now()) {
  const status = String(event?.status || '').toLowerCase();
  if (FINALS.has(status)) return 'results';
  if (ACTIVE.has(status)) {
    const observed = Date.parse(event?.updated_at || event?.score_observed_at || event?.start_time || '');
    return Number.isFinite(observed) && now - observed > 6 * 3600000 ? 'other' : 'fixtures';
  }
  const at = Date.parse(event?.start_time || '');
  if (SCHEDULED.has(status) && Number.isFinite(at) && at >= now - 3 * 3600000) return 'fixtures';
  return 'other';
}

export function newsMatches(payload, competition, { view, season = '', team = '', group = '', range = null, now = Date.now() } = {}) {
  const checked = scopedNewsData(payload, competition);
  const rows = Array.isArray(checked?.events) ? checked.events : [];
  const meta = checked?.competition;
  const dataKey = typeof meta === 'string' ? meta : meta?.id || meta?.competition_id;
  const unique = new Map();
  for (const event of rows) {
    if (!event || event.sport !== 'football' || event.competition_key !== dataKey) continue;
    if (competition === 'uefa-womens-champions-league' && event.football_gender && event.football_gender !== 'women') continue;
    if (!event.home?.name || !event.away?.name || !event.start_time || !Number.isFinite(Date.parse(event.start_time))) continue;
    if (range && (Date.parse(event.start_time) < range.start || Date.parse(event.start_time) >= range.end)) continue;
    if (season && !sameNewsSeason(event.season, season)) continue;
    if (group && event.group !== group) continue;
    if (team && ![event.home.name, event.away.name].some(name => newsTeamName(name) === newsTeamName(team))) continue;
    if (view && newsMatchBucket(event, now) !== view) continue;
    const identity = event.key || event.id;
    if (!identity) continue;
    unique.set(String(identity), event);
  }
  return [...unique.values()].sort((a, b) => (view === 'results' ? -1 : 1) *
    (Date.parse(a.start_time) - Date.parse(b.start_time) || String(a.key || a.id).localeCompare(String(b.key || b.id))));
}

export function newsScore(event, side) {
  if (newsMatchBucket(event) === 'other' || SCHEDULED.has(String(event?.status || '').toLowerCase())) return '—';
  const score = event?.score?.[side];
  return (typeof score === 'number' || typeof score === 'string') && String(score).trim() !== ''
    && Number.isInteger(Number(score)) && Number(score) >= 0 ? String(Number(score)) : '—';
}


/** Bounded GETs: an unavailable upstream supplement cannot spin a News tab forever. */
async function boundedRead(get, path, signal, timeoutMs) {
  const controller = new AbortController();
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  let timer, abort;
  const cancelled = new Promise((_, reject) => {
    abort = () => { controller.abort(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
  });
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('News data request timed out')); }, timeoutMs);
  });
  try { return await Promise.race([get(path, { signal: controller.signal }), deadline, cancelled]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

/** Exact, cancellable, date-bounded reads of public retained records only. */
export async function readNewsDateRange(get, competition, range, { season = '', signal, timeoutMs = 12000 } = {}) {
  if (!range || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end <= range.start || range.end - range.start > 94 * 86400000)
    throw new Error('Invalid News date range');
  let empty = null, lastError;
  for (const key of newsDataKeys(competition)) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    try {
      const query = new URLSearchParams({ sport: 'football', competition: key, date_from: range.from, date_to: range.to });
      const raw = await boundedRead(get, `/sports-data/events?${query}`, signal, timeoutMs);
      if (!raw || raw.sport !== 'football' || raw.competition !== key || !Array.isArray(raw.events) ||
          raw.snapshot?.date_from !== range.from || raw.snapshot?.date_to !== range.to)
        throw new Error('Unverified public date-window scope');
      const partial = raw.snapshot.complete !== true || raw.snapshot.count !== raw.events.length;
      const data = { competition: { id: key, sport: 'football' }, events: raw.events, season: season || null,
        available: raw.connected !== false, _newsRead: { partial, rangeKey: range.key, readAt: new Date().toISOString() },
        coverage: { truncated: partial, scope: 'date_bounded_stored_records' } };
      data.events = newsMatches(data, competition, { season, range });
      if (data.events.length) return data;
      empty = data;
    } catch (error) { if (signal?.aborted) throw error; lastError = error; }
  }
  if (empty && !lastError) return empty;
  if (empty) return { ...empty, _newsRead: { ...empty._newsRead, partial: true } };
  throw lastError || new Error('Competition data is unavailable');
}

export async function readNewsData(get, competition, view, { season = '', signal, timeoutMs = 12000, now = Date.now(), range = null } = {}) {
  if (range && view !== 'standings') return readNewsDateRange(get, competition, range, { season, signal, timeoutMs });
  let empty = null, lastError;
  for (const key of newsDataKeys(competition)) {
    try {
      const raw = await boundedRead(get, newsDataPath(competition, view, view === 'standings' ? season : '', key), signal, timeoutMs);
      const data = scopedNewsData(raw, competition);
      const actual = typeof data?.competition === 'string' ? data.competition : data?.competition?.id || data?.competition?.competition_id;
      if (!data || actual !== key || (season && data.season && !sameNewsSeason(data.season, season))) throw new Error('Unverified competition or season scope');
      if (!Array.isArray(view === 'standings' ? data.rows : data.events)) throw new Error('Unverified data structure');
      if (view !== 'standings' && season) {
        const selected = newsMatches(data, competition, { season });
        if (selected.length) return { ...data, events: selected, season };
      } else if ((view === 'standings' ? data.rows : data.events).length) return data;
      empty = view !== 'standings' && season ? { ...data, events: [], season } : data;
    } catch (error) { lastError = error; }
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    // The hub may be waiting for a remote supplement. Read only the retained,
    // date-bounded public records; never start ingestion or synthesize fixtures.
    if (view !== 'standings') {
      const from = new Date(now - 60 * 86400000).toISOString().slice(0, 10);
      const to = new Date(now + 90 * 86400000).toISOString().slice(0, 10);
      const query = new URLSearchParams({ sport: 'football', competition: key, date_from: from, date_to: to });
      try {
        const raw = await boundedRead(get, `/sports-data/events?${query}`, signal, timeoutMs);
        if (!raw || raw.sport !== 'football' || raw.competition !== key || !Array.isArray(raw.events) || !raw.snapshot || !String(raw.snapshot.date_from || '').startsWith(from) || !String(raw.snapshot.date_to || '').startsWith(to))
          throw new Error('Unverified public records response');
        const events = raw.events.filter(row => row.sport === 'football' && row.competition_key === key && (!season || sameNewsSeason(row.season, season)));
        if (events.length) return { competition: { id: key, sport: 'football' }, events, available: true,
          coverage: { truncated: true }, checked_at: raw.checked_at || null, seasons: [], season: season || null };
      } catch (error) { lastError = error; }
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    }
  }
  if (empty) return lastError ? { ...empty, _newsRead: { partial: true } } : empty;
  throw lastError || new Error('Competition data is unavailable');
}

/** A retained phase is clearly labelled; it is not a full-season aggregate. */
export function newsDataPhase(payload, competition) {
  const data = scopedNewsData(payload, competition);
  const key = typeof data?.competition === 'string' ? data.competition : data?.competition?.id;
  return competition === 'mexico-liga-expansion' && key === 'football-mex-liga-de-expansion-mx-apertura' ? 'Apertura' : null;
}
