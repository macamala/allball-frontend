import { sameNewsSeason } from './newsFootballView.js';
/** Small, News-only memory cache. Never stores or updates Live Scores state. */
import { scopedNewsData, FOOTBALL_NEWS_TOPICS } from './newsFootballData.js';

export const NEWS_DATA_FRESH_MS = 60000;
export const NEWS_DATA_RETAIN_MS = 5 * 60000;
const MAX_ENTRIES = 8;
const MAX_ENTRY_CHARS = 750000;
const MAX_TOTAL_CHARS = 2000000;
const entries = new Map();

function keyFor(competition, view, season, scope = '') {
  if (!competition || FOOTBALL_NEWS_TOPICS.has(competition)) return null;
  return JSON.stringify([competition, view === 'standings' ? 'standings' : 'matches', season || '', scope]);
}

function valid(payload, competition, view, season) {
  return scopedNewsData(payload, competition)
    && (!season || sameNewsSeason(payload.season, season))
    && Array.isArray(view === 'standings' ? payload.rows : payload.events);
}

export function rememberNewsData(competition, view, season, payload, now = Date.now(), scope = '') {
  const key = keyFor(competition, view, season, scope);
  if (!key || !Number.isFinite(now) || !valid(payload, competition, view, season) || (scope && payload._newsRead?.rangeKey !== scope)) return false;
  try {
    const json = JSON.stringify(payload);
    if (json.length > MAX_ENTRY_CHARS) return false;
    entries.delete(key);
    entries.set(key, { json, savedAt: now });
    let total = [...entries.values()].reduce((sum, entry) => sum + entry.json.length, 0);
    while (entries.size > MAX_ENTRIES || total > MAX_TOTAL_CHARS) {
      const first = entries.keys().next().value;
      total -= entries.get(first).json.length;
      entries.delete(first);
    }
    return true;
  } catch { return false; }
}

export function peekNewsData(competition, view, season = '', now = Date.now(), scope = '') {
  const key = keyFor(competition, view, season, scope);
  const entry = entries.get(key);
  if (!entry) return null;
  const age = now - entry.savedAt;
  if (!Number.isFinite(age) || age < 0 || age > NEWS_DATA_RETAIN_MS) {
    entries.delete(key);
    return null;
  }
  try {
    const data = JSON.parse(entry.json);
    if (!valid(data, competition, view, season)) return null;
    // A caller can filter/sort without mutating a later News tab's snapshot.
    return { data, savedAt: entry.savedAt, fresh: age < NEWS_DATA_FRESH_MS };
  } catch { entries.delete(key); return null; }
}

export function clearNewsDataCache() { entries.clear(); }
