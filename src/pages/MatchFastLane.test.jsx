import React from 'react';
import {render,screen,waitFor,act,cleanup} from '@testing-library/react';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {I18nProvider} from '../context/I18nContext.jsx';
import {clearPublicCache} from '../api.js';
import MatchPage from './MatchPage.jsx';
const h=vi.hoisted(()=>({polls:new Map()}));
vi.mock('../hooks/useVisiblePoll.js',()=>({default:(fn,ms)=>{if(ms)h.polls.set(ms,fn);}}));
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({favorites:{},syncFavorites:vi.fn()})}));
const observed=Date.now();
const payload=(id,minute,status='live',offset=0)=>({id,connected:true,event:{id,sport:'football',event_family:'team_match',competition_key:'test',home:{name:`Home ${id}`},away:{name:`Away ${id}`},status,live:status==='live',live_class:status==='live'?'CONFIRMED_LIVE':null,start_time:new Date(observed-3600000).toISOString(),score_observed_at:new Date(observed+offset).toISOString(),score:{home:1,away:0,minute},statistics:[{label:'Shots',home:4,away:2}]}});
const response=p=>({ok:true,status:200,json:async()=>p,text:async()=>JSON.stringify(p)});
function mount(){let navigate;function Page(){navigate=useNavigate();return <MatchPage/>;}
 const view=render(<I18nProvider><MemoryRouter initialEntries={['/scores/event/a']}><Routes><Route path='/scores/event/:matchId' element={<Page/>}/></Routes></MemoryRouter></I18nProvider>);
 return {...view,navigate:path=>navigate(path)};}
beforeEach(()=>{clearPublicCache();h.polls.clear();});afterEach(cleanup);
it('updates a lightweight score without waiting for rich detail and keeps richer fields',async()=>{
 let release,slow;global.fetch=vi.fn(input=>{const url=String(input);if(url.endsWith('/matches/a/score'))return new Promise(r=>{release=()=>r(response(payload('a',64,'live',1000)));});if(url.includes('/matches/a'))return Promise.resolve(response(payload('a',60)));return Promise.resolve(response({}));});
 mount();await screen.findByText('Home a');expect(h.polls.has(5000)).toBe(true);expect(h.polls.has(30000)).toBe(true);
 const initialCalls=global.fetch.mock.calls.length;
 await act(async()=>{h.polls.get(5000)();h.polls.get(5000)();});expect(global.fetch.mock.calls.length).toBe(initialCalls+1);
 await act(async()=>release());await waitFor(()=>expect(document.querySelector('.mc-clock-block').textContent).toContain('64'));
 expect(screen.getByRole('tab',{name:/statistics/i})).toBeTruthy();
});
it('a slow older detail cannot turn the newest final back into live',async()=>{
 let older;let n=0;global.fetch=vi.fn(input=>{const url=String(input);if(url.endsWith('/matches/a/score'))return Promise.resolve(response(payload('a',90,'finished',20000)));if(url.includes('/matches/a')){n++;return n===1?Promise.resolve(response(payload('a',60))):new Promise(r=>{older=()=>r(response(payload('a',61)));});}return Promise.resolve(response({}));});
 mount();await screen.findByText('Home a');await act(async()=>{h.polls.get(30000)();});await act(async()=>h.polls.get(5000)());await waitFor(()=>expect(document.querySelector('.mc-clock-block').textContent).toContain('FT'));
 await act(async()=>older());expect(document.querySelector('.mc-clock-block').textContent).toContain('FT');expect(screen.queryByRole('timer')).toBeNull();
});
it('rejects a previous visit response after A to B to A navigation',async()=>{
 let release;global.fetch=vi.fn(input=>{const url=String(input);if(url.endsWith('/matches/a/score'))return new Promise(r=>{release=()=>r(response(payload('a',88,'live',50000)));});if(url.includes('/matches/a'))return Promise.resolve(response(payload('a',60)));if(url.includes('/matches/b'))return Promise.resolve(response(payload('b',20)));return Promise.resolve(response({}));});
 const view=mount();await screen.findByText('Home a');await act(async()=>{h.polls.get(5000)();});await act(async()=>view.navigate('/scores/event/b'));await screen.findByText('Home b');await act(async()=>view.navigate('/scores/event/a'));await screen.findByText('Home a');
 await act(async()=>release());expect(document.querySelector('.mc-clock-block').textContent).not.toContain('88');
});
