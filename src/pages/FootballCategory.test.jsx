import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {I18nProvider} from '../context/I18nContext.jsx';
import {clearPublicCache} from '../api.js';
import {groupEventsByCompetition,normalizeEvent} from '../lib/sportsData.js';
import LiveScoresPage from './LiveScoresPage.jsx';
vi.mock('../hooks/useVisiblePoll.js',()=>({default:()=>{}}));
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({favorites:{sports:[],teams:[],competitions:[]},syncFavorites:vi.fn()})}));
const kickoff=new Date().toISOString();
const rows=['men','women','unknown'].map((category,index)=>({id:category,sport:'football',football_gender:category,home:{id:String(index*2+1),name:`${category === 'men' ? 'Male' : category === 'women' ? 'Female' : 'Unknown'} Home`},away:{id:String(index*2+2),name:`${category} Away`},status:'live',live:true,live_class:'CONFIRMED_LIVE',source_fetch_time:kickoff,start_time:kickoff,event_family:'team_match',competition_key:`league-${category}`,competition:`League ${category}`,score:{home:1,away:0}}));
function Location(){return <output data-testid="where">{useLocation().search}</output>;}
function page(path='/live-scores?sport=football'){return render(<I18nProvider><MemoryRouter initialEntries={[path]}><Location/><LiveScoresPage/></MemoryRouter></I18nProvider>);}
beforeEach(()=>{clearPublicCache();sessionStorage.clear();global.fetch=vi.fn(async()=>({ok:true,status:200,json:async()=>({connected:true,events:rows}),text:async()=>JSON.stringify({connected:true,events:rows})}));});
afterEach(cleanup);
it('retains the server category through normalization and never assumes unknown means men',()=>{
 expect(normalizeEvent(rows[1]).football_gender).toBe('women');expect(normalizeEvent({...rows[0],football_gender:undefined}).football_gender).toBe('unknown');
});
it('keeps female and male events out of the same competition block even for legacy same-key data',()=>{
 const copy=rows.slice(0,2).map(r=>({...r,competition_key:'mixed',competition:'Legacy'}));
 expect(groupEventsByCompetition(copy)).toHaveLength(2);expect(copy).toHaveLength(2);
});
it('category selection filters board and sidebar together without another fetch or lost fixtures',async()=>{
 const {container}=page();await waitFor(()=>expect(container.querySelectorAll('.score-centre-main .score-row-link').length).toBe(3));
 const controls=screen.getByRole('group',{name:'Football category'});const before=global.fetch.mock.calls.length;
 fireEvent.click(within(controls).getByRole('button',{name:/^Women/}));
 expect(container.querySelector('.score-centre-main').textContent).toContain('Female Home');expect(container.querySelector('.score-centre-main').textContent).not.toContain('Male Home');
 expect(container.querySelector('.score-centre-aside').textContent).toContain('Female Home');expect(container.querySelector('.score-live-global').textContent).toMatch(/1/);
 expect(screen.getByTestId('where').textContent).toContain('category=women');
 fireEvent.click(within(controls).getByRole('button',{name:/^Men/}));expect(container.querySelectorAll('.score-centre-main .score-row-link').length).toBe(1);
 fireEvent.click(within(controls).getByRole('button',{name:/^All football/}));expect(container.querySelectorAll('.score-centre-main .score-row-link').length).toBe(3);expect(global.fetch.mock.calls.length).toBe(before);
});
it('restores a bookmarked category and preserves it when the status view changes',async()=>{
 const {container}=page('/live-scores?sport=football&category=women');await waitFor(()=>expect(container.querySelectorAll('.score-centre-main .score-row-link').length).toBe(1));
 fireEvent.click(screen.getByRole('tab',{name:/^LIVE/}));expect(screen.getByTestId('where').textContent).toContain('category=women');
});
