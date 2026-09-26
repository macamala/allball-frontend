// Dependency-free executable checks of the exact production policy module.
import assert from 'node:assert/strict';
import test from 'node:test';
import { matchDetailPollMs, FINAL_DETAIL_WINDOW_MS } from '../src/lib/matchRefresh.js';

const now = Date.parse('2026-09-26T05:00:00Z');
const base = { id: 'stable-id', sport: 'football', status: 'finished', start_time: '2026-09-25T23:00:00Z' };
const cases = [
  ['recent final remains refreshable', base, 60000],
  ['live detail interval unchanged', { ...base, status: 'live' }, 30000],
  ['halftime detail interval unchanged', { ...base, status: 'halftime' }, 30000],
  ['scheduled detail interval unchanged', { ...base, status: 'scheduled' }, 30000],
  ['missing event does not poll', null, 0],
  ['missing identity does not poll', { ...base, id: '' }, 0],
  ['other sports keep terminal policy', { ...base, sport: 'tennis' }, 0],
  ['cancelled does not pretend to be played', { ...base, status: 'cancelled' }, 0],
  ['awarded does not pretend to be played', { ...base, status: 'awarded' }, 0],
  ['abandoned does not pretend to be played', { ...base, status: 'abandoned' }, 0],
  ['walkover is not a played final', { ...base, status: 'walkover' }, 0],
  ['old final eventually stops polling', { ...base, start_time: '2026-09-20T23:00:00Z' }, 0],
  ['missing kickoff is not today', { ...base, start_time: null }, 0],
  ['invalid kickoff is not today', { ...base, start_time: 'invalid' }, 0],
  ['future terminal date is not interpolated', { ...base, start_time: '2026-09-27T23:00:00Z' }, 0],
  ['offset timestamp denotes same instant', { ...base, start_time: '2026-09-26T09:00:00+10:00' }, 60000],
  ['window is inclusive at boundary', { ...base, start_time: new Date(now-FINAL_DETAIL_WINDOW_MS).toISOString() }, 60000],
  ['window expires without date fallback', { ...base, start_time: new Date(now-FINAL_DETAIL_WINDOW_MS-1).toISOString() }, 0],
];
for (const [name, event, expected] of cases) test(name, () => {
  const before = structuredClone(event);
  assert.equal(matchDetailPollMs(event, now), expected);
  assert.deepEqual(event, before, 'Polling policy must not modify score, status or identity');
});
for (const status of ['FT', 'final', 'ended', 'aet', 'pen', 'complete']) test(`played final alias ${status}`, () => {
  assert.equal(matchDetailPollMs({ ...base, status }, now), 60000);
});
