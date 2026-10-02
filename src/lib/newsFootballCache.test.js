import { beforeEach, it, expect } from 'vitest';
import { clearNewsDataCache, rememberNewsData, peekNewsData, NEWS_DATA_FRESH_MS, NEWS_DATA_RETAIN_MS } from './newsFootballCache.js';
const league = 'england-premier-league', now = 100000000;
const board = (key = league, extra = {}) => ({ competition: { id: key, sport: 'football' }, events: [{ id: 'one' }], rows: [], season: '2026/2027', ...extra });
beforeEach(clearNewsDataCache);
it('shares Fixtures and Results but not standings, competitions or seasons', () => {
  expect(rememberNewsData(league, 'fixtures', '', board(), now)).toBe(true);
  expect(peekNewsData(league, 'results', '', now).data.events[0].id).toBe('one');
  expect(peekNewsData(league, 'standings', '', now)).toBeNull();
  expect(peekNewsData('spain-la-liga', 'results', '', now)).toBeNull();
  expect(peekNewsData(league, 'results', '2025/2026', now)).toBeNull();
});
it('distinguishes one-minute freshness from bounded retained data and rejects clock reversal', () => {
  rememberNewsData(league, 'results', '', board(), now);
  expect(peekNewsData(league, 'results', '', now + NEWS_DATA_FRESH_MS - 1).fresh).toBe(true);
  expect(peekNewsData(league, 'results', '', now + NEWS_DATA_FRESH_MS).fresh).toBe(false);
  expect(peekNewsData(league, 'results', '', now + NEWS_DATA_RETAIN_MS + 1)).toBeNull();
  rememberNewsData(league, 'results', '', board(), now);
  expect(peekNewsData(league, 'results', '', now - 1)).toBeNull();
});
it('rejects malformed, foreign-sport, wrong-league, wrong-season and topic data', () => {
  for (const value of [null, {}, [], board('spain-la-liga'), board(league, { competition: { id: league, sport: 'basketball' } }), board(league, { events: null })])
    expect(rememberNewsData(league, 'results', '', value, now)).toBe(false);
  expect(rememberNewsData(league, 'standings', '2025/2026', board(), now)).toBe(false);
  expect(rememberNewsData('football-youth', 'results', '', board('football-youth'), now)).toBe(false);
});
it('does not share mutable objects between callers or cache an oversized payload', () => {
  const original = board(); rememberNewsData(league, 'results', '', original, now);
  original.events[0].id = 'changed';
  const first = peekNewsData(league, 'results', '', now);first.data.events.length = 0;
  expect(peekNewsData(league, 'results', '', now).data.events[0].id).toBe('one');
  expect(rememberNewsData(league, 'results', '', board(league, { huge: 'x'.repeat(750001) }), now)).toBe(false);
});
it('keeps the cache bounded and lets an authoritative empty response clear previous records', () => {
  for (let i = 0; i < 9; i++) rememberNewsData('test-'+i, 'results', '', board('test-'+i), now);
  expect(peekNewsData('test-0', 'results', '', now)).toBeNull();
  expect(peekNewsData('test-8', 'results', '', now)).not.toBeNull();
  rememberNewsData('test-8', 'results', '', board('test-8', { events: [] }), now);
  expect(peekNewsData('test-8', 'results', '', now).data.events).toEqual([]);
});
it('accepts only the explicitly mapped alias for a News menu', () => {
  expect(rememberNewsData('south-korea-k-league-1', 'results', '', board('korea-k-league-1'), now)).toBe(true);
  expect(peekNewsData('south-korea-k-league-2', 'results', '', now)).toBeNull();
});
