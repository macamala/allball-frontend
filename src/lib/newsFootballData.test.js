import { describe, it, expect, vi } from 'vitest';
import { FOOTBALL_NEWS_TOPICS, newsDataPath, newsDataKeys, readNewsData, newsMatches, newsMatchBucket, newsScore, scopedNewsData } from './newsFootballData.js';
const key = 'england-premier-league';
const now = Date.parse('2026-10-02T08:00:00Z');
const event = (id, status = 'scheduled', extra = {}) => ({ key: id, id, sport: 'football', competition_key: key, season: '2026/2027', start_time: '2026-10-03T12:00:00Z', home: { name: 'Arsenal' }, away: { name: 'Chelsea' }, status, score: { home: 0, away: 0 }, ...extra });
const payload = events => ({ competition: { id: key, sport: 'football' }, events });
it('creates only exact existing public read paths and no topic aggregates', () => {
  expect(newsDataPath(key, 'fixtures')).toBe('/sports-data/competitions/england-premier-league/hub');
  expect(newsDataPath(key, 'results')).toBe(newsDataPath(key, 'fixtures'));
  expect(newsDataPath(key, 'standings', '2026/2027')).toBe('/sports-data/standings?league=england-premier-league&season=2026%2F2027');
  for (const topic of FOOTBALL_NEWS_TOPICS) expect(newsDataPath(topic, 'standings')).toBeNull();
});
it('fails closed on another competition, another sport, or malformed response', () => {
  for (const data of [null, [], {}, { competition: { id: 'spain-la-liga' } }, { competition: { id: key, sport: 'ice-hockey' } }]) expect(scopedNewsData(data, key)).toBeNull();
  expect(scopedNewsData({ competition: key, sport: 'football' }, key)).not.toBeNull();
});
it('does not leak leagues, seasons, duplicate aliases or malformed matches', () => {
  const rows = [event('ok'), event('ok'), event('wrong', 'finished', { competition_key: 'spain-la-liga' }), event('old', 'finished', { season: '2025/2026' }), event('bad', 'finished', { start_time: 'broken' }), event('sport', 'finished', { sport: 'basketball' })];
  expect(newsMatches(payload(rows), key, { season: '2026/2027' }).map(e => e.id)).toEqual(['ok']);
});
it('separates actual finals from scheduled, postponed and stale past fixtures', () => {
  expect(newsMatchBucket(event('1'), now)).toBe('fixtures');
  expect(newsMatchBucket(event('2', 'finished'), now)).toBe('results');
  expect(newsMatchBucket(event('3', 'scheduled', { start_time: '2026-09-01T00:00:00Z' }), now)).toBe('other');
  for (const status of ['cancelled', 'postponed', 'awaiting_confirmation']) expect(newsMatchBucket(event(status, status), now)).toBe('other');
});
it('preserves a real nil score and never turns an unknown or scheduled score into 0', () => {
  expect(newsScore(event('1', 'finished'), 'home')).toBe('0');
  expect(newsScore(event('2'), 'home')).toBe('—');
  for (const score of [null, '', false, -1, 'NaN', 0.5]) expect(newsScore(event('3', 'finished', { score: { home: score } }), 'home')).toBe('—');
});
it('supports exact group/team filters and newest-first results', () => {
  const rows = [event('early', 'finished', { start_time: '2026-10-01T12:00:00Z', group: 'A' }), event('later', 'finished', { group: 'A' }), event('B', 'finished', { group: 'B' })];
  expect(newsMatches(payload(rows), key, { view: 'results', group: 'A', team: 'Chelsea' }).map(e => e.id)).toEqual(['later', 'early']);
});

it('uses verified canonical aliases without mixing similarly named competitions', () => {
  expect(newsDataPath('japan-j1-league', 'fixtures')).toBe('/sports-data/competitions/japan-j1/hub');
  const rows = { competition: { id: 'japan-j1', sport: 'football' }, events: [event('jp', 'finished', {competition_key:'japan-j1'})] };
  expect(newsMatches(rows,'japan-j1-league',{view:'results'})).toHaveLength(1);
  expect(scopedNewsData(rows,'japan-j2-league')).toBeNull();
  expect(newsDataKeys('italy-serie-b')).not.toContain('football-bra-s-rie-b');
  expect(scopedNewsData({competition:{id:'womens-super-league',sport:'football'}},key)).toBeNull();
});
it('tries an explicit second data key when the original key has no verified table', async () => {
  const get = vi.fn().mockResolvedValueOnce({competition:{id:'italy-serie-b',sport:'football'},rows:[]})
    .mockResolvedValueOnce({competition:{id:'football-ita-serie-b',sport:'football'},rows:[{team:'Bari',points:12}]});
  const data = await readNewsData(get,'italy-serie-b','standings');
  expect(data.rows[0].team).toBe('Bari');
  expect(get.mock.calls[1][0]).toBe('/sports-data/standings?league=football-ita-serie-b');
});
it('falls back to bounded retained public records after a hub timeout', async () => {
  const get = vi.fn().mockImplementationOnce(() => new Promise(() => {}))
    .mockImplementationOnce(path => { const query=new URLSearchParams(path.split('?')[1]);return Promise.resolve({sport:'football',competition:key,
      snapshot:{date_from:query.get('date_from'),date_to:query.get('date_to')},events:[event('kept','finished'),event('other','finished',{competition_key:'spain-la-liga'})]}); });
  const data=await readNewsData(get,key,'results',{timeoutMs:10,now});
  expect(data.events.map(row=>row.id)).toEqual(['kept']);
  expect(data.coverage.truncated).toBe(true);
  expect(get.mock.calls[0][1].signal.aborted).toBe(true);
  expect(get.mock.calls.every(([path])=>path.startsWith('/sports-data/'))).toBe(true);
});
it('does not accept a wrong date-window or league response during fallback', async () => {
  const get=vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({sport:'football',competition:key,
    snapshot:{date_from:'2001-01-01',date_to:'2001-02-01'},events:[event('bad','finished')]});
  await expect(readNewsData(get,key,'results',{now})).rejects.toThrow('Unverified public records response');
});
it('rejects the wrong requested season rather than showing last seasons points', async () => {
  const get=vi.fn().mockResolvedValue({competition:{id:key,sport:'football'},season:'2025/2026',rows:[{team:'Arsenal',points:80}]});
  await expect(readNewsData(get,key,'standings',{season:'2026/2027'})).rejects.toThrow('Unverified competition or season scope');
});
it('does not fetch anything after cancellation', async () => {
  const controller=new AbortController();controller.abort();const get=vi.fn();
  await expect(readNewsData(get,key,'standings',{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
  expect(get).not.toHaveBeenCalled();
});
