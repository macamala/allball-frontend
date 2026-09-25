import { isConfirmedLive } from './sportsData.js';
export const textKey = value => String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
export function matchBucket(event, now = Date.now()) {
  if (['finished', 'complete', 'final', 'ft', 'ended', 'aet', 'pen'].includes(String(event?.status || '').toLowerCase())) return 'results';
  if (isConfirmedLive(event) || ['in_progress', 'halftime', 'break'].includes(event?.status)) return 'fixtures';
  const at = Date.parse(event?.start_time || '');
  return ['scheduled', 'upcoming', 'not_started'].includes(event?.status) && Number.isFinite(at) && at >= now - 3 * 3600000 ? 'fixtures' : 'other';
}
export function filteredMatches(events, { view = 'fixtures', team = '', round = '', now = Date.now() } = {}) {
  return (events || []).filter(e => (view === 'all' || matchBucket(e, now) === view)
    && (!team || [e.home, e.away].some(s => textKey(s?.name) === team || String(s?.id || '') === team))
    && (!round || String(e.round || '') === round))
    .sort((a, b) => (view === 'results' ? -1 : 1) * ((a.start_time || '').localeCompare(b.start_time || '') || String(a.key || a.id).localeCompare(String(b.key || b.id))));
}
export function mutualSummary(event, rows) {
  const counts = { home: 0, draws: 0, away: 0, total: 0, homeGoals: 0, awayGoals: 0 };
  const name = textKey(event?.home?.name), other = textKey(event?.away?.name);
  for (const row of rows || []) {
    const a = row.score?.home, b = row.score?.away;
    if (a == null || b == null || a === '' || b === '' || typeof a === 'boolean' || typeof b === 'boolean'
      || !Number.isFinite(Number(a)) || !Number.isFinite(Number(b))) continue;
    const normal = textKey(row.home?.name) === name && textKey(row.away?.name) === other;
    const reverse = textKey(row.away?.name) === name && textKey(row.home?.name) === other;
    if (!normal && !reverse) continue;
    const home = Number(normal ? a : b), away = Number(normal ? b : a);
    counts[home > away ? 'home' : home < away ? 'away' : 'draws'] += 1;
    counts.total += 1; counts.homeGoals += home; counts.awayGoals += away;
  }
  return counts;
}
