import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { I18nProvider } from '../context/I18nContext.jsx';
import { FOOTBALL_NEWS_LEAGUES } from '../config/newsFootball.js';
import { resolveLeague, leaguePath, getPrimaryNav } from '../config/sports.js';
import LeaguePage from './LeaguePage.jsx';
const api=vi.hoisted(()=>({getArticles:vi.fn()}));
vi.mock('../api.js',()=>({getArticles:api.getArticles,peekArticles:()=>null}));
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({favorites:{leagues:[]},syncFavorites:vi.fn()})}));
const article=(id,league,title)=>({id,slug:`story-${id}`,sport:'football',league,title,published_at:'2026-09-29T01:00:00Z',quality_ok:true,sport_match_ok:true});
function page(path){return render(<I18nProvider><MemoryRouter initialEntries={[path]}><Link to='/football/serie-a'>Switch to Italy</Link><Routes><Route path='/:sportSlug/:leagueSlug' element={<LeaguePage/>}/></Routes></MemoryRouter></I18nProvider>);}
beforeEach(()=>{api.getArticles.mockReset();localStorage.clear();});
afterEach(cleanup);
it('Other leagues is a searchable directory, not a mixed article feed',async()=>{
  page('/football/other-leagues');
  expect(screen.getByRole('status').textContent).toBe(`${FOOTBALL_NEWS_LEAGUES.length} competitions`);
  expect(api.getArticles).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Japan'}});
  expect(screen.getByRole('link',{name:'J2 League'}).getAttribute('href')).toBe('/football/japan-j2-league');
  expect(screen.queryByRole('link',{name:'La Liga'})).toBeNull();
});
it('every directory link resolves to its own canonical filter and label',()=>{
  const paths=new Set();
  for(const row of FOOTBALL_NEWS_LEAGUES){
    expect(resolveLeague('football',row.path).league).toBe(row.league);
    expect(resolveLeague('football',row.league).label).toBe(row.label);
    expect(leaguePath('football',row.league)).toBe('/football/'+row.path);
    paths.add(row.path);
  }
  expect(paths.size).toBe(FOOTBALL_NEWS_LEAGUES.length);
  expect(getPrimaryNav(k=>k).find(n=>n.path==='/live-scores')).toEqual({label:'liveScores',path:'/live-scores'});
});
it('shows only the chosen league and clears it immediately on league navigation',async()=>{
  api.getArticles.mockResolvedValueOnce([article(1,'spain-la-liga','Spain story'),article(2,'italy-serie-a','Unrelated Italy story')]);
  let resolveItaly;api.getArticles.mockImplementationOnce(()=>new Promise(resolve=>{resolveItaly=resolve;}));
  page('/football/la-liga');
  await screen.findByText('Spain story');
  expect(screen.queryByText('Unrelated Italy story')).toBeNull();
  expect(api.getArticles).toHaveBeenCalledWith({sport:'football',league:'spain-la-liga',limit:80});
  fireEvent.click(screen.getByText('Switch to Italy'));
  await waitFor(()=>expect(api.getArticles).toHaveBeenCalledWith({sport:'football',league:'italy-serie-a',limit:80}));
  expect(screen.queryByText('Spain story')).toBeNull();
  resolveItaly([article(3,'italy-serie-a','Italy story')]);
  await screen.findByText('Italy story');
});
it('loads further pages from the same league and deduplicates overlapping rows',async()=>{
  const rows=Array.from({length:80},(_,i)=>article(i+1,'serbia-superliga',`Serbia story ${i+1}`));
  api.getArticles.mockResolvedValueOnce(rows).mockResolvedValueOnce([rows[79],article(81,'serbia-superliga','Next Serbia story'),article(82,'spain-la-liga','Wrong page story')]);
  page('/football/superliga');
  fireEvent.click(await screen.findByRole('button',{name:'Show more news'}));
  await screen.findByText('Next Serbia story');
  expect(api.getArticles).toHaveBeenLastCalledWith({sport:'football',league:'serbia-superliga',limit:80,offset:80});
  expect(screen.getAllByText('Serbia story 80')).toHaveLength(1);
  expect(screen.queryByText('Wrong page story')).toBeNull();
});
