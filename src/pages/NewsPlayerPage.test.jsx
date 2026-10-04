import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { it, expect, vi, afterEach } from 'vitest';
import NewsPlayerPage from './NewsPlayerPage.jsx';
import { entityTextParts } from '../lib/newsEntityLinks.js';
vi.mock('../lib/seo.js', () => ({ setPageSeo: vi.fn() }));
const facts = { id: '438456', name: 'Rade Krunić', gender: 'men', checked_at: '2026-10-04T04:00:00Z',
  team: { id: '8687', name: 'FK Crvena Zvezda', href: '/teams/8687?sport=football' },
  fields: [{ label: 'Date of birth', value: '1993-10-07' }, { label: 'Height', value: '184 cm' }],
  competition: { name: 'Super Liga', season: '2026/2027', stats: [{ label: 'Goals', value: 1 }, { label: 'Assists', value: 0 }] },
  career: [{ team: 'Milan', start: '2019-07-08', end: '2024-01-13', appearances: 140, goals: 3, assists: null }],
  photo: 'https://images.fotmob.com/image_resources/playerimages/438456.png', source: 'FotMob', note: 'Verified source facts.' };
const entity = { id: '438456', kind: 'player', name: 'Rade Krunić', aliases: ['Rade Krunić'], href: '/football/players/438456?article=player-returns', profile: facts };
const payload = { article_id: 19, slug: 'player-returns', sport: 'football', teams: [], players: [entity], matches: [] };
function mount(path = entity.href) { return render(<MemoryRouter initialEntries={[path]}><Link to='/football/players/999?article=other-story'>Other profile</Link><Routes><Route path='/football/players/:playerKey' element={<NewsPlayerPage />} /><Route path='/article/player-returns' element={<p>Original article</p>} /></Routes></MemoryRouter>); }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('opens the article-bound player with real values and preserves zero versus missing stats', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload })); mount();
  await screen.findByRole('heading', { name: 'Rade Krunić' });
  expect(screen.getByText('184 cm')).toBeTruthy(); expect(screen.getByText('Super Liga · 2026/2027')).toBeTruthy();
  expect(screen.getByText('0')).toBeTruthy(); expect(screen.getByText('140 appearances · 3 goals')).toBeTruthy();
  expect(screen.queryByText('0 assists')).toBeNull();
  expect(screen.getByRole('link', { name: 'FK Crvena Zvezda' }).getAttribute('href')).toContain('/teams/8687');
  expect(fetch.mock.calls[0][0]).toBe('/news-data/football/articles/player-returns/context');
  expect(fetch.mock.calls[0][1].credentials).toBe('omit');
  fireEvent.click(screen.getByRole('link', { name: '← Back to article' })); await screen.findByText('Original article');
});
it.each([{ ...payload, slug: 'other' }, { ...payload, sport: 'basketball' }, { ...payload, players: [{ ...entity, id: '999' }] },
  { ...payload, players: [{ ...entity, profile: { ...facts, id: '999' } }] }, { ...payload, players: [{ ...entity, profile: { ...facts, name: 'Another Person' } }] }])('wrong identity or article context is never shown', async data => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data })); mount(); await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'Rade Krunić' })).toBeNull(); expect(screen.queryByText('184 cm')).toBeNull();
});
it('an unavailable source gives recovery, not a fabricated biography', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({ ok: true, json: async () => payload });
  vi.stubGlobal('fetch', fetcher); mount(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('heading', { name: 'Rade Krunić' }); expect(fetcher).toHaveBeenCalledTimes(2);
});
it('moving to another player clears old facts immediately and discards a late response', async () => {
  let resolve;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => payload }).mockImplementationOnce(() => new Promise(r => { resolve = r; })));
  mount(); await screen.findByRole('heading', { name: 'Rade Krunić' }); fireEvent.click(screen.getByRole('link', { name: 'Other profile' }));
  expect(screen.queryByRole('heading', { name: 'Rade Krunić' })).toBeNull();
  await waitFor(() => expect(resolve).toBeTypeOf('function')); resolve({ ok: true, json: async () => payload });
  await screen.findByRole('alert'); expect(screen.queryByText('184 cm')).toBeNull();
});
it('invalid article or player identifiers make no network request', async () => {
  vi.stubGlobal('fetch', vi.fn()); mount('/football/players/no-id?article=bad%2Fpath'); await screen.findByRole('alert'); expect(fetch).not.toHaveBeenCalled();
});
it('player names become links without altering article punctuation or route to Live Scores', () => {
  const original = 'Rade Krunić — returned to training.'; const parts = entityTextParts(original, [entity]);
  expect(parts.map(p => p.text).join('')).toBe(original); expect(parts.find(p => p.entity).entity.href).toBe(entity.href);
});
it('failed player photograph is removed rather than replaced with publisher branding', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload })); mount();
  const photo = await screen.findByRole('img', { name: 'Rade Krunić' }); fireEvent.error(photo);
  expect(screen.queryByRole('img')).toBeNull(); expect(screen.getByRole('heading', { name: 'Rade Krunić' })).toBeTruthy();
});
