import React from 'react';
import { render, screen, fireEvent, within, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, Link } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { I18nProvider } from '../context/I18nContext.jsx';
import EventList from '../components/scores/EventList.jsx';
import CompetitionStandingsPage from './CompetitionStandingsPage.jsx';
import { competitionStandingsPath } from '../lib/sportsData.js';
const mocks = vi.hoisted(()=>({getStandings:vi.fn(),poll:null}));
vi.mock('../api.js',()=>({getStandings:mocks.getStandings}));
vi.mock('../hooks/useVisiblePoll.js',()=>({default:(callback)=>{mocks.poll=callback;}}));
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({favorites:{leagues:[],sports:[]},syncFavorites:vi.fn()})}));
const a='UEFA Nations League A Grp. 2', b='UEFA Nations League B Grp. 3';
const rows=[{team:'Serbia',team_id:'1',group:a,points:3,played:1},{team:'Greece',team_id:'2',group:a,points:0,played:1},{team:'Austria',team_id:'3',group:b,points:1,played:1},{team:'Israel',team_id:'4',group:b,points:1,played:1}];
const data={competition:{id:'uefa-nations-league',name:'UEFA Nations League',sport:'football'},rows,season:'2026',seasons:['2026','2025'],updated_at:'2026-09-25T09:00:00Z'};
const event={id:'must-not-open',sport:'football',competition_key:'uefa-nations-league',competition:'UEFA Nations League',group:b,standings_available:true,status:'scheduled',start_time:'2026-09-25T10:00:00Z',home:{name:'Austria'},away:{name:'Israel'},event_family:'team_match'};
function Location(){return <output data-testid="location">{useLocation().pathname+useLocation().search}</output>;}
function view(path, events=[event]){return render(<I18nProvider><MemoryRouter initialEntries={[path]}><Location/><Link to="/scores/competition/other-league/standings">Other league</Link><Routes><Route path="/live-scores" element={<EventList events={events}/>}/><Route path="/scores/competition/:competitionKey/standings" element={<CompetitionStandingsPage/>}/><Route path="/scores/event/:id" element={<p>Wrong match navigation</p>}/></Routes></MemoryRouter></I18nProvider>);}
beforeEach(()=>{mocks.getStandings.mockReset().mockResolvedValue(data);mocks.poll=null;});
afterEach(cleanup);
it('Table opens the competition and exact group, never the first match',async()=>{
  view('/live-scores');fireEvent.click(screen.getByRole('link',{name:'Table'}));
  await screen.findByRole('table');
  expect(screen.getByTestId('location').textContent).toContain('/scores/competition/uefa-nations-league/standings');
  expect(screen.getByTestId('location').textContent).not.toContain('must-not-open');
  expect(within(screen.getByRole('table')).getByText('Austria')).toBeTruthy();
  expect(within(screen.getByRole('table')).queryByText('Serbia')).toBeNull();
  expect(screen.queryByText('Wrong match navigation')).toBeNull();
  expect(document.querySelector('.mc-hero')).toBeNull();
  expect(mocks.getStandings).toHaveBeenCalledWith('uefa-nations-league',{season:''});
});
it('group switching updates the deep link without a match or another table request',async()=>{
  view(competitionStandingsPath('uefa-nations-league',{group:a}));await screen.findByRole('table');
  const select=screen.getByRole('combobox',{name:'Standings group'});fireEvent.change(select,{target:{value:select.options[1].value}});
  await waitFor(()=>expect(within(screen.getByRole('table')).getByText('Austria')).toBeTruthy());
  expect(decodeURIComponent(screen.getByTestId('location').textContent.replace(/\+/g,' '))).toContain(b);
  expect(mocks.getStandings).toHaveBeenCalledTimes(1);
});
it('an unknown requested group is not silently replaced by the first group',async()=>{
  view(competitionStandingsPath('uefa-nations-league',{group:'Nonexistent Group'}));await screen.findByRole('table');
  expect(within(screen.getByRole('table')).queryByText('Serbia')).toBeNull();
  expect(within(screen.getByRole('table')).queryByText('Austria')).toBeNull();
  expect(screen.getByRole('combobox',{name:'Standings group'}).value).toBe('');
});
it('selecting an available season requests that season rather than current match data',async()=>{
  view(competitionStandingsPath('uefa-nations-league'));await screen.findByRole('table');
  mocks.getStandings.mockResolvedValue({...data,season:'2025',rows:[{team:'Old season club',points:4}]});
  fireEvent.change(screen.getByRole('combobox',{name:'Standings season'}),{target:{value:'2025'}});
  await screen.findByText('Old season club');
  expect(mocks.getStandings).toHaveBeenLastCalledWith('uefa-nations-league',{season:'2025'});
});
it('keeps the last good table during a failed refresh',async()=>{
  view(competitionStandingsPath('uefa-nations-league'));await screen.findByRole('table');
  mocks.getStandings.mockRejectedValue(new Error('temporary source failure'));
  await act(async()=>{await mocks.poll();});
  expect(screen.getByRole('alert')).toBeTruthy();expect(screen.getByRole('table')).toBeTruthy();
});
it('does not let an old league response overwrite a newer navigation',async()=>{
  let resolveOld;mocks.getStandings.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValue({...data,competition:{name:'Other League'},rows:[{team:'New team',points:3}]});
  view(competitionStandingsPath('uefa-nations-league'));fireEvent.click(screen.getByText('Other league'));await screen.findByText('New team');
  await act(async()=>resolveOld(data));expect(screen.queryByText('Serbia')).toBeNull();expect(screen.getByText('New team')).toBeTruthy();
});
it('shows an honest empty state instead of manufacturing a table',async()=>{
  mocks.getStandings.mockResolvedValue({...data,rows:[],seasons:[]});view(competitionStandingsPath('football-friendlies'));
  await screen.findByText('Standings not available yet');expect(screen.queryByRole('table')).toBeNull();
});

it('one leaf Table link shows its scoped table even when native group text has a parent prefix',async()=>{
  const name='EURO U21 Qualification Grp. C', key='football-euro-u21-qualification-grp-c';
  mocks.getStandings.mockResolvedValue({competition:{id:key,name,sport:'football'},rows:[{team:'Iceland U21',team_id:'is',points:3,group:'EURO U-21 Qualification '+name},{team:'France U21',team_id:'fr',points:0,group:'EURO U-21 Qualification '+name}]});
  const leaf={...event,competition_key:key,competition:name,competition_name:name};
  view('/live-scores',[{...leaf,id:'plain',group:null},{...leaf,id:'rich',group:name}]);
  expect(screen.getAllByRole('link',{name:'Table'})).toHaveLength(1);
  fireEvent.click(screen.getByRole('link',{name:'Table'}));await screen.findByRole('table');
  expect(within(screen.getByRole('table')).getByText('Iceland U21')).toBeTruthy();
  expect(screen.getByTestId('location').textContent).not.toContain('group=');
  expect(screen.queryByText('Wrong match navigation')).toBeNull();
  expect(mocks.getStandings).toHaveBeenCalledWith(key,{season:''});
});
