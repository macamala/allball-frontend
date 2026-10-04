import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import FootballNewsData from './FootballNewsData.jsx';
import { clearNewsDataCache } from '../lib/newsFootballCache.js';
const api = vi.hoisted(() => ({ getJSON: vi.fn() }));
vi.mock('../api.js', () => api);
vi.mock('./StandingsTable.jsx', () => ({ default: ({ rows }) => <table aria-label="Standings"><tbody>{rows.map(row => <tr key={row.team}><td>{row.team}</td><td>{row.points}</td></tr>)}</tbody></table> }));
const key = 'england-premier-league';
const game = (id, status = 'finished', extra = {}) => ({ id, key: id, competition_key: key, sport: 'football', season: '2026/2027', status, start_time: '2026-10-03T12:00:00Z', home: { name: 'Arsenal' }, away: { name: 'Chelsea' }, score: { home: 0, away: 2 }, details_available: true, ...extra });
const board = (extra = {}) => ({ competition: { id: key, name: 'Premier League', sport: 'football' }, events: [game('one')], available: true, ...extra });
function mount(props = {}) { return render(<MemoryRouter><FootballNewsData competition={key} label="Premier League" view="results" {...props} /></MemoryRouter>); }
beforeEach(() => { api.getJSON.mockReset(); clearNewsDataCache(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('loads the existing competition endpoint, actual final scores and match links', async () => {
  api.getJSON.mockResolvedValue(board()); mount();
  expect(await screen.findByRole('link', { name: 'Open match: Arsenal vs Chelsea' })).toBeTruthy();
  expect(screen.getByText('0')).toBeTruthy(); expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open match: Arsenal vs Chelsea' }).getAttribute('href')).toContain('one');
  expect(api.getJSON.mock.calls[0][0]).toBe('/sports-data/competitions/england-premier-league/hub');
});
it('loads actual standings rather than a permanently empty placeholder', async () => {
  api.getJSON.mockResolvedValue(board({ rows: [{ team: 'Arsenal', points: 18 }], seasons: ['2026/2027'] })); mount({ view: 'standings' });
  expect(await screen.findByRole('table', { name: 'Standings' })).toBeTruthy();
  expect(screen.getByText('18')).toBeTruthy();
  expect(api.getJSON.mock.calls[0][0]).toBe('/sports-data/standings?league=england-premier-league');
});
it('does not fetch league data for a news topic', () => {
  mount({ competition: 'football-women', label: "Women's football" });
  expect(screen.getByText(/news topic covering multiple competitions/)).toBeTruthy();
  expect(api.getJSON).not.toHaveBeenCalled();
});
it('blocks an incorrectly scoped response instead of mixing leagues', async () => {
  api.getJSON.mockResolvedValue(board({ competition: { id: 'spain-la-liga' } })); mount();
  await screen.findByRole('alert'); expect(screen.queryByText('Arsenal')).toBeNull();
});
it('can retry errors and distinguishes unavailable data from a zero-filled table', async () => {
  api.getJSON.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(board({ rows: [] })); mount({ view: 'standings' });
  await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Refresh data' }));
  await screen.findByText('No confirmed standings available for this selection');
  expect(screen.queryByRole('table')).toBeNull();
});
it('does not resurrect an old request after changing the season', async () => {
  let oldReply;
  api.getJSON.mockResolvedValueOnce(board({ rows: [{ team: 'Arsenal', points: 18 }], seasons: ['2026/2027', '2025/2026'] }))
    .mockImplementationOnce(() => new Promise(resolve => { oldReply = resolve; }))
    .mockResolvedValueOnce(board({ rows: [{ team: 'Chelsea', points: 12 }], season: '2026/2027', seasons: ['2026/2027', '2025/2026'] }));
  mount({ view: 'standings' });
  const select = await screen.findByRole('combobox', { name: 'News data season' });
  fireEvent.change(select, { target: { value: '2025/2026' } });
  await waitFor(() => expect(api.getJSON).toHaveBeenCalledTimes(2));
  // The same component can be refreshed without an old response winning.
  cleanup(); clearNewsDataCache(); mount({ view: 'standings' });
  await screen.findByText('Chelsea'); oldReply(board({ rows: [{ team: 'Old club', points: 99 }] }));
  await waitFor(() => expect(screen.queryByText('Old club')).toBeNull());
  expect(api.getJSON.mock.calls[1][1].signal.aborted).toBe(true);
});
it('reuses the same verified payload when switching from Fixtures to Results', async () => {
  api.getJSON.mockResolvedValue(board()); const { rerender } = mount({ view: 'fixtures' });
  await screen.findByRole('combobox', { name: 'News data team' });
  rerender(<MemoryRouter><FootballNewsData competition={key} label="Premier League" view="results" /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Open match: Arsenal vs Chelsea' });
  expect(api.getJSON).toHaveBeenCalledTimes(1);
});
it('keeps a verified result visible when a forced refresh fails', async () => {
  api.getJSON.mockResolvedValueOnce(board()).mockRejectedValue(new Error('offline'));
  mount(); await screen.findByRole('link', { name: 'Open match: Arsenal vs Chelsea' });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh data' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('link', { name: 'Open match: Arsenal vs Chelsea' })).toBeTruthy();
  expect(screen.getByText(/Showing the last successfully loaded records/)).toBeTruthy();
});
it('refreshes retained records when the browser reports that the connection is restored', async () => {
  api.getJSON.mockResolvedValueOnce(board()).mockResolvedValueOnce(board({ events: [game('second', 'finished', { score: { home: 3, away: 1 } })] }));
  mount(); await screen.findByText('2');
  window.dispatchEvent(new Event('online'));
  await screen.findByText('3'); expect(api.getJSON).toHaveBeenCalledTimes(2);
});
it('requests the chosen date window and keeps it when switching Fixtures and Results', async () => {
  api.getJSON.mockImplementation(async path => {
    if(path.includes('/events?')){const q=new URLSearchParams(path.split('?')[1]);return {sport:'football',competition:key,connected:true,
      snapshot:{complete:true,count:1,date_from:q.get('date_from'),date_to:q.get('date_to')},events:[game('dated')]};}
    return board();
  });
  const {rerender}=mount();await screen.findByRole('link',{name:'Open match: Arsenal vs Chelsea'});
  fireEvent.change(screen.getByLabelText('News matches from'),{target:{value:'2026-10-03'}});
  fireEvent.change(screen.getByLabelText('News matches to'),{target:{value:'2026-10-03'}});
  fireEvent.click(screen.getByRole('button',{name:'Apply dates'}));
  await waitFor(()=>expect(api.getJSON.mock.calls.some(c=>c[0].includes('/events?'))).toBe(true));
  await waitFor(()=>expect(screen.getByRole('link',{name:'Open match: Arsenal vs Chelsea'}).getAttribute('href')).toContain('dated'));
  rerender(<MemoryRouter><FootballNewsData competition={key} label="Premier League" view="fixtures" /></MemoryRouter>);
  expect(screen.getByText(/Selected: 2026-10-03 to 2026-10-03/)).toBeTruthy();
});
it('rejects reversed dates without requesting or erasing a successfully loaded result',async()=>{
  api.getJSON.mockResolvedValue(board());mount();await screen.findByRole('link',{name:'Open match: Arsenal vs Chelsea'});
  fireEvent.change(screen.getByLabelText('News matches from'),{target:{value:'2026-10-05'}});
  fireEvent.change(screen.getByLabelText('News matches to'),{target:{value:'2026-10-03'}});
  fireEvent.click(screen.getByRole('button',{name:'Apply dates'}));
  expect(screen.getByRole('alert').textContent).toContain('must not be before');
  expect(api.getJSON).toHaveBeenCalledTimes(1);expect(screen.getByRole('link',{name:'Open match: Arsenal vs Chelsea'})).toBeTruthy();
});
it('gives verified teams and the match separate usable links without nested anchors',async()=>{
  api.getJSON.mockResolvedValue(board({events:[game('linked','finished',{home:{id:'100',name:'Arsenal'},away:{id:'200',name:'Chelsea'}})]}));mount();
  const match=await screen.findByRole('link',{name:'Open match: Arsenal vs Chelsea'});
  expect(match.getAttribute('href')).toContain('linked');
  const team=screen.getByRole('link',{name:'Arsenal'});expect(team.getAttribute('href')).toContain('/teams/100?');expect(team.getAttribute('href')).toContain('competition=england-premier-league');
  expect(document.querySelector('a a')).toBeNull();
});
