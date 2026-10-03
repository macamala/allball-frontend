import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import NewsRefreshBar from './NewsRefreshBar.jsx';
import LeagueNewsPreview from './LeagueNewsPreview.jsx';
const api = vi.hoisted(() => ({ getArticles: vi.fn() }));
vi.mock('../api.js', () => api);
const league = 'england-championship';
const row = (id, extra = {}) => ({ id, title: 'Blackburn confirmed news ' + id, slug: 'story-' + id, sport: 'football', league, published_at: '2026-10-03T01:00:00Z', image_url: 'https://example.com/photo.jpg', ...extra });
let observers;
beforeEach(() => {
  api.getArticles.mockReset(); observers = [];
  vi.stubGlobal('IntersectionObserver', class {
    constructor(fn) { this.fn = fn; this.disconnect = vi.fn(); observers.push(this); }
    observe() {}
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('loads a visible league preview with actual article links and publication dates, not all leagues at once', async () => {
  api.getArticles.mockResolvedValue([row(1), row(2, { league: 'spain-la-liga' })]);
  render(<MemoryRouter><LeagueNewsPreview league={league} /></MemoryRouter>);
  expect(api.getArticles).not.toHaveBeenCalled();
  act(() => observers[0].fn([{ isIntersecting: true }]));
  const link = await screen.findByRole('link', { name: /Blackburn confirmed news 1/ });
  expect(link.getAttribute('href')).toBe('/article/story-1');
  expect(link.querySelector('img').getAttribute('src')).toBe('https://example.com/photo.jpg');
  expect(link.querySelector('time').getAttribute('datetime')).toBe('2026-10-03T01:00:00Z');
  expect(screen.queryByText('Blackburn confirmed news 2')).toBeNull();
  expect(api.getArticles).toHaveBeenCalledWith({ sport: 'football', league, limit: 2 });
});
it('does not label a network failure as an empty league and can retry', async () => {
  api.getArticles.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([row(1)]);
  render(<MemoryRouter><LeagueNewsPreview league={league} /></MemoryRouter>);
  act(() => observers[0].fn([{ isIntersecting: true }]));
  fireEvent.click(await screen.findByRole('button', { name: 'Retry news' }));
  await screen.findByRole('link', { name: /Blackburn confirmed news 1/ });
  expect(screen.queryByText('No published story yet.')).toBeNull();
});
it('keeps previously loaded preview copy on failed refresh but never fabricates a missing story', async () => {
  api.getArticles.mockResolvedValueOnce([row(1)]).mockRejectedValueOnce(new Error('offline'));
  const view = render(<MemoryRouter><LeagueNewsPreview league={league} revision={0} /></MemoryRouter>);
  act(() => observers[0].fn([{ isIntersecting: true }]));
  await screen.findByRole('link', { name: /Blackburn confirmed news 1/ });
  view.rerender(<MemoryRouter><LeagueNewsPreview league={league} revision={1} /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Retry news' });
  expect(screen.getByRole('link', { name: /Blackburn confirmed news 1/ })).toBeTruthy();
});
it('ignores late preview responses after changing league', async () => {
  let reply;
  api.getArticles.mockImplementationOnce(() => new Promise(resolve => { reply = resolve; })).mockResolvedValueOnce([]);
  const view = render(<MemoryRouter><LeagueNewsPreview league={league} /></MemoryRouter>);
  act(() => observers[0].fn([{ isIntersecting: true }]));
  await waitFor(() => expect(api.getArticles).toHaveBeenCalledTimes(1));
  view.rerender(<MemoryRouter><LeagueNewsPreview league="spain-la-liga" /></MemoryRouter>);
  await screen.findByText('No published story yet.');
  await act(async () => reply([row(1)]));
  expect(screen.queryByText('Blackburn confirmed news 1')).toBeNull();
});
it('does not show future dates, rejected articles or missing publication identities', async () => {
  api.getArticles.mockResolvedValue([row(1, { published_at: '2999-01-01T00:00:00Z' }), row(2, { quality_ok: false }), row(3, { sport: 'basketball' }), row(4, { slug: '' })]);
  render(<MemoryRouter><LeagueNewsPreview league={league} /></MemoryRouter>);
  act(() => observers[0].fn([{ isIntersecting: true }]));
  await screen.findByText('No published story yet.'); expect(screen.queryAllByRole('link')).toHaveLength(0);
});
it('refreshes open news periodically and stops after unmount', () => {
  vi.useFakeTimers(); const load = vi.fn();
  const view = render(<NewsRefreshBar onRefresh={load} />);
  act(() => vi.advanceTimersByTime(60000)); expect(load).toHaveBeenCalledTimes(1);
  view.unmount(); act(() => vi.advanceTimersByTime(120000)); expect(load).toHaveBeenCalledTimes(1);
});
it('does not poll when the tab is hidden, inactive, or busy', () => {
  vi.useFakeTimers(); const load = vi.fn();
  const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  const view = render(<NewsRefreshBar onRefresh={load} />);
  act(() => vi.advanceTimersByTime(60000)); expect(load).not.toHaveBeenCalled();
  visible.mockReturnValue('visible'); view.rerender(<NewsRefreshBar onRefresh={load} busy />);
  act(() => vi.advanceTimersByTime(60000)); expect(load).not.toHaveBeenCalled();
  view.rerender(<NewsRefreshBar onRefresh={load} enabled={false} />);
  act(() => vi.advanceTimersByTime(60000)); expect(load).not.toHaveBeenCalled(); visible.mockRestore();
});
it('offers manual news refresh without reloading the page or starting a writer', () => {
  const load = vi.fn(); render(<NewsRefreshBar onRefresh={load} checkedAt="2026-10-03T01:00:00Z" />);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh news' })); expect(load).toHaveBeenCalledTimes(1);
  expect(document.querySelector('time').getAttribute('datetime')).toBe('2026-10-03T01:00:00Z');
});

it('labels disconnected saved pages even when the browser has a cached success response',()=>{
  vi.useFakeTimers();const connected=vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
  const load=vi.fn();const view=render(<NewsRefreshBar onRefresh={load} checkedAt="2026-10-03T01:00:00Z" />);
  connected.mockReturnValue(false);act(()=>window.dispatchEvent(new Event('offline')));
  expect(screen.getByRole('status').textContent).toContain('Offline — showing saved news');
  expect(screen.getByRole('button',{name:'Refresh news'}).disabled).toBe(true);
  expect(document.querySelector('time')).toBeNull();
  act(()=>vi.advanceTimersByTime(60000));expect(load).not.toHaveBeenCalled();
  connected.mockReturnValue(true);act(()=>window.dispatchEvent(new Event('online')));
  expect(screen.getByRole('button',{name:'Refresh news'}).disabled).toBe(false);
  expect(load).toHaveBeenCalledTimes(1);
  view.unmount();connected.mockRestore();
});
