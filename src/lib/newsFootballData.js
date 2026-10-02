/** News-only presentation of existing, public football records. No ingestion. */
export const FOOTBALL_NEWS_TOPICS = new Set([
  'football-international', 'football-youth', 'football-women', 'football-national-teams',
]);
const FINALS = new Set(['finished', 'complete', 'final', 'ft', 'ended', 'aet', 'pen']);
const ACTIVE = new Set(['live', 'in_progress', 'halftime', 'break']);
const SCHEDULED = new Set(['scheduled', 'upcoming', 'not_started']);

export function newsDataPath(competition, view, season = '') {
  if (!competition || FOOTBALL_NEWS_TOPICS.has(competition)) return null;
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
  if (key !== competition || (sport && sport !== 'football')) return null;
  return payload;
}

export function newsMatchBucket(event, now = Date.now()) {
  const status = String(event?.status || '').toLowerCase();
  if (FINALS.has(status)) return 'results';
  if (ACTIVE.has(status)) return 'fixtures';
  const at = Date.parse(event?.start_time || '');
  if (SCHEDULED.has(status) && Number.isFinite(at) && at >= now - 3 * 3600000) return 'fixtures';
  return 'other';
}

export function newsMatches(payload, competition, { view, season = '', team = '', group = '', now = Date.now() } = {}) {
  const checked = scopedNewsData(payload, competition);
  const rows = Array.isArray(checked?.events) ? checked.events : [];
  const unique = new Map();
  for (const event of rows) {
    if (!event || event.sport !== 'football' || event.competition_key !== competition) continue;
    if (!event.home?.name || !event.away?.name || !event.start_time || !Number.isFinite(Date.parse(event.start_time))) continue;
    if (season && String(event.season || '') !== season) continue;
    if (group && event.group !== group) continue;
    if (team && ![event.home.name, event.away.name].includes(team)) continue;
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
