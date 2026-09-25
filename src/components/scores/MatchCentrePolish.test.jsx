import React from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation,Routes,Route} from 'react-router-dom';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {I18nProvider} from '../../context/I18nContext.jsx';
import MatchPage from '../../pages/MatchPage.jsx';
import MatchCentre from './MatchCentre.jsx';
import FootballTimeline from './FootballTimeline.jsx';
import FootballShots from './FootballShots.jsx';
import {clearPublicCache} from '../../api.js';
vi.mock('../../context/AuthContext.jsx',()=>({useAuth:()=>({favorites:{},syncFavorites:vi.fn()})}));
const event={id:'canonical',sport:'football',event_family:'team_match',status:'finished',home:{name:'Home FC'},away:{name:'Away FC'},score:{home:0,away:1},competition_key:'test-league',start_time:'2026-09-19T18:45:00Z'};
const t=key=>({'match.timeline':'Timeline','match.firstHalf':'First half','match.secondHalf':'Second half'}[key]||key);
const wrap=ui=>render(<I18nProvider><MemoryRouter>{ui}</MemoryRouter></I18nProvider>);
beforeEach(()=>{clearPublicCache();global.fetch=vi.fn(()=>Promise.resolve({ok:true,json:async()=>({}),text:async()=>'{}'})));});
afterEach(cleanup);
it('renders the real canonical match behind an old URL, with its rich sections',async()=>{
  const data={connected:true,id:'old',event:{...event,statistics:[{label:'Possession',home:40,away:60}]},header:event};
  global.fetch=vi.fn(url=>Promise.resolve({ok:true,json:async()=>String(url).includes('/matches/old')?data:{},text:async()=>JSON.stringify(String(url).includes('/matches/old')?data:{})}));
  render(<I18nProvider><MemoryRouter initialEntries={['/scores/event/old']}><Routes><Route path='/scores/event/:matchId' element={<MatchPage/>}/></Routes></MemoryRouter></I18nProvider>);
  await waitFor(()=>expect(screen.getByText('Home FC')).toBeTruthy());
  expect(screen.getByText('0 – 1')).toBeTruthy();expect(screen.getByRole('tab',{name:/statistics/i})).toBeTruthy();
});
it('preserves tab selection in the URL for refresh and player return',()=>{
  function Location(){return <span data-testid='where'>{useLocation().hash}</span>;}
  wrap(<><Location/><MatchCentre event={{...event,statistics:[{label:'Shots',home:2,away:3}]}} data={{}} standings={[]}/></>);
  fireEvent.click(screen.getByRole('tab',{name:/statistics/i}));
  expect(screen.getByTestId('where').textContent).toBe('#mc-stats');
});
it('renders named substitutions, correct goal score, added time and player links',()=>{
  const onPlayer=vi.fn();wrap(<FootballTimeline t={t} onPlayerSelect={onPlayer} items={[
    {type:'substitution',minute:59,player_in:'Incoming',player_out:'Outgoing',player_in_id:'11',player_out_id:'10',side:'home'},
    {type:'goal',minute:90,stoppage:4,player:'Scorer',player_id:20,side:'away',score_after:{home:0,away:1}},
    {type:'red_card',family:'card',minute:90,stoppage:5,player:'Dismissed',side:'home'}
  ]}/>);
  expect(screen.getByText('90+4’')).toBeTruthy();expect(screen.getByText('0–1')).toBeTruthy();expect(document.querySelector('.mc-event-icon.is-red-card')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Open Incoming details'}));expect(onPlayer).toHaveBeenCalledWith({name:'Incoming',id:'11'});
  fireEvent.click(screen.getByRole('button',{name:'Key events'}));expect(screen.queryByText('Outgoing')).toBeNull();expect(screen.getByText('Scorer')).toBeTruthy();
});
it('shows all recorded shots and filters by team and goals without inventing missing xG',()=>{
  const shots=Array.from({length:30},(_,i)=>({id:i,player:`Player ${i}`,player_id:i,side:i%2?'away':'home',minute:i+1,type:i===29?'Goal':'Miss',xg:i===0?0:null}));
  wrap(<FootballShots shots={shots} event={event}/>);
  expect(document.querySelectorAll('.mc-shot-list li').length).toBe(30);expect(screen.getByText('0.00')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Away FC'}));expect(document.querySelectorAll('.mc-shot-list li').length).toBe(15);
  fireEvent.click(screen.getByRole('button',{name:'Goals only'}));expect(document.querySelectorAll('.mc-shot-list li').length).toBe(1);expect(screen.getByText('Player 29')).toBeTruthy();
});
