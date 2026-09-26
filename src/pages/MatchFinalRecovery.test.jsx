import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { I18nProvider } from '../context/I18nContext.jsx';
import { clearPublicCache } from '../api.js';
import MatchPage from './MatchPage.jsx';

const h = vi.hoisted(() => ({ polls: new Map() }));
vi.mock('../hooks/useVisiblePoll.js', () => ({ default: (fn, ms) => { if (ms) h.polls.set(ms, fn); } }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ favorites: {}, syncFavorites: vi.fn() }) }));
const payload = (extra = {}) => ({
  connected: true, id: 'recovery', event: {
    id: 'recovery', sport: 'football', football_gender: 'women',
    event_family: 'team_match', competition_key: 'football-test-women',
    home: { name: 'Home Women' }, away: { name: 'Away Women' },
    start_time: new Date(Date.now()-4*3600000).toISOString(),
    status: 'finished', live: false, score: { home: 1, away: 0 }, ...extra,
  },
});
const response = data => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });
function mount(preview = null) {
  return render(<I18nProvider><MemoryRouter initialEntries={[preview ? { pathname: '/scores/event/recovery', state: { event: preview } } : '/scores/event/recovery']}><Routes>
    <Route path='/scores/event/:matchId' element={<MatchPage />} />
  </Routes></MemoryRouter></I18nProvider>);
}
beforeEach(() => { clearPublicCache(); h.polls.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('loads late statistics after FT without reopening the match or restarting the score clock', async () => {
  let count = 0;
  global.fetch = vi.fn(input => String(input).includes('/matches/recovery')
    ? Promise.resolve(response(++count === 1 ? payload() : payload({ statistics: [{ label: 'Total shots', home: 6, away: 2 }] })))
    : Promise.resolve(response({})));
  mount(); await screen.findByText('Home Women');
  expect(h.polls.has(60000)).toBe(true);
  expect(h.polls.has(5000)).toBe(false);
  expect(h.polls.has(15000)).toBe(false);
  expect(screen.queryByRole('tab', { name: /statistics/i })).toBeNull();
  await act(async () => h.polls.get(60000)());
  await screen.findByRole('tab', { name: /statistics/i });
  expect(document.querySelector('.mc-clock-block').textContent).toContain('FT');
  expect(screen.queryByRole('timer')).toBeNull();
});

it('keeps the last good final detail on a transient failure then accepts the next successful refresh', async () => {
  let count = 0;
  global.fetch = vi.fn(input => {
    if (!String(input).includes('/matches/recovery')) return Promise.resolve(response({}));
    count += 1;
    if (count === 2) return Promise.reject(new Error('temporary'));
    return Promise.resolve(response(payload({ statistics: [{ label: 'Total shots', home: count === 1 ? 6 : 7, away: 2 }] })));
  });
  mount(); await screen.findByRole('tab', { name: /statistics/i });
  await act(async () => h.polls.get(60000)());
  expect(screen.getByRole('tab', { name: /statistics/i })).toBeTruthy();
  expect(document.querySelector('.mc-clock-block').textContent).toContain('FT');
  await act(async () => h.polls.get(60000)());
  expect(count).toBe(3);
  expect(screen.getByText('Home Women')).toBeTruthy();
});

it('does not overlap slow final-detail requests', async () => {
  let resolve;
  let count = 0;
  global.fetch = vi.fn(input => {
    if (!String(input).includes('/matches/recovery')) return Promise.resolve(response({}));
    count += 1;
    return count === 1 ? Promise.resolve(response(payload())) : new Promise(done => { resolve = () => done(response(payload())); });
  });
  mount(); await screen.findByText('Home Women');
  await act(async () => { h.polls.get(60000)(); h.polls.get(60000)(); });
  expect(count).toBe(2);
  await act(async () => resolve());
  await waitFor(() => expect(document.querySelector('.mc-clock-block').textContent).toContain('FT'));
});


it('does not overlap a visibility poll with the first request when a board preview is already visible', async () => {
  let resolveInitial;
  let count = 0;
  const initial = payload();
  global.fetch = vi.fn(input => {
    if (!String(input).includes('/matches/recovery')) return Promise.resolve(response({}));
    count += 1;
    if (count === 1) return new Promise(done => { resolveInitial = () => done(response(initial)); });
    return Promise.resolve(response(initial));
  });
  mount(initial.event);
  await screen.findByText('Home Women');
  expect(h.polls.has(60000)).toBe(true);
  await act(async () => h.polls.get(60000)());
  expect(count).toBe(1);
  await act(async () => resolveInitial());
  await act(async () => h.polls.get(60000)());
  expect(count).toBe(2);
});

it('stops requests when the recovery window expires even without a successful re-render', async () => {
  const initial = payload();
  let count = 0;
  global.fetch = vi.fn(input => {
    if (!String(input).includes('/matches/recovery')) return Promise.resolve(response({}));
    count += 1;
    return count === 1 ? Promise.resolve(response(initial)) : Promise.reject(new Error('temporary'));
  });
  mount(); await screen.findByText('Home Women');
  await act(async () => h.polls.get(60000)());
  expect(count).toBe(2);
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(initial.event.start_time) + 73 * 3600000);
  await act(async () => h.polls.get(60000)());
  expect(count).toBe(2);
});
