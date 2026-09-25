import React from 'react';
import {render,screen,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {I18nProvider} from '../context/I18nContext.jsx';
import {clearPublicCache} from '../api.js';
import LiveScoresPage from './LiveScoresPage.jsx';
import EventRow from '../components/scores/EventRow.jsx';
vi.mock('../hooks/useVisiblePoll.js',()=>({default:()=>{}}));
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({favorites:{sports:['tennis'],teams:[],competitions:[]},syncFavorites:vi.fn()})}));
const at=new Date(Date.now()-600000).toISOString();
const match=(id,sport,home,away)=>({id,sport,home:{name:home},away:{name:away},status:'live',live:true,live_class:'CONFIRMED_LIVE',source_fetch_time:new Date().toISOString(),start_time:at,event_family:sport==='tennis'?'individual_match':'team_match',competition_key:sport==='tennis'?'wta-tour':'england-premier-league',competition:sport==='tennis'?'WTA Tour':'Premier League',score:{home:1,away:0},periods:[{home:6,away:4},{home:2,away:1}]});
const football=match('football-one','football','Everton CD','Universidad de Chile');
const tennis=match('tennis-one','tennis','Alexandra Verylongname / Partner One','Caroline Verylongname / Partner Two');
const cs2=match('esport-one','cs2','Esports Alpha','Esports Beta');
const data={connected:true,events:[football,tennis,cs2]};
function page(sport){return render(<I18nProvider><MemoryRouter initialEntries={[`/live-scores?sport=${sport}`]}><LiveScoresPage/></MemoryRouter></I18nProvider>);}
beforeEach(()=>{clearPublicCache();global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:async()=>data,text:async()=>JSON.stringify(data)}));});
afterEach(cleanup);
describe('live board follows the selected sport everywhere',()=>{
  it.each(['football','tennis','mine'])('sidebar and live count use %s scope',async sport=>{
    const {container}=page(sport);
    await waitFor(()=>expect(container.querySelector('.score-centre-aside .score-row')).toBeTruthy());
    const aside=container.querySelector('.score-centre-aside');
    const isFootball=sport==='football';
    expect(aside.textContent).toContain(isFootball?'Universidad de Chile':'Alexandra Verylongname');
    expect(aside.textContent).not.toContain(isFootball?'Alexandra Verylongname':'Universidad de Chile');
    expect(aside.textContent).not.toContain('Esports Alpha');
    expect(container.querySelector('.score-live-global').textContent).toMatch(/1/);
    expect(aside.textContent).toContain(isFootball?'Premier League':'WTA Tour');
    expect(aside.textContent).not.toContain(isFootball?'WTA Tour':'Premier League');
  });
  it('all sports continues to include every live sport',async()=>{
    const {container}=page('all');
    await waitFor(()=>expect(container.querySelectorAll('.score-centre-aside .score-row').length).toBe(3));
    expect(container.querySelector('.score-live-global').textContent).toMatch(/3/);
  });
  it('esports includes child disciplines without leaking football or tennis',async()=>{
    const {container}=page('esports');
    await waitFor(()=>expect(container.querySelector('.score-centre-aside .score-row')).toBeTruthy());
    const aside=container.querySelector('.score-centre-aside');
    expect(aside.textContent).toContain('Esports Alpha');expect(aside.textContent).not.toContain('Universidad de Chile');
  });
});
describe('compact sidebar keeps names readable without taking away main-board sets',()=>{
  it.each([true,false])('compact=%s only hides redundant per-period columns',compact=>{
    const {container}=render(<I18nProvider><MemoryRouter><div className="page-scores"><ul><EventRow event={tennis} compact={compact}/></ul></div></MemoryRouter></I18nProvider>);
    expect(container.querySelectorAll('.score-sets').length).toBe(compact?0:2);
    expect(screen.getByTitle(tennis.home.name)).toBeTruthy();expect(screen.getByTitle(tennis.away.name)).toBeTruthy();
    expect(container.querySelectorAll('.score-mid')[0].textContent).toBe('1');
  });
});
