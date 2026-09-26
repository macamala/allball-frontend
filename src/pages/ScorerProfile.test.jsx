import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {afterEach,it,expect,vi} from 'vitest';
import PlayerPage from './PlayerPage.jsx';
const mock=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('../api.js',()=>({getPlayerProfile:mock.get}));
vi.mock('../lib/seo.js',()=>({setPageSeo:vi.fn()}));
afterEach(()=>{cleanup();mock.get.mockReset();});
it('verifies the scorer scope and returns to its own season leaderboard',async()=>{
 mock.get.mockResolvedValue({available:true,name:'Player A',player:{id:'7',name:'Player A',position:'Striker'},appearances:[]});
 render(<MemoryRouter initialEntries={['/players/7?name=Player+A&competition_key=football-nor-toppserien&season=2026']}><Routes><Route path="/players/:playerKey" element={<PlayerPage/>}/></Routes></MemoryRouter>);
 await screen.findByRole('heading',{name:'Player A'});
 expect(mock.get).toHaveBeenCalledWith('7',{name:'Player A',event_id:'',competition_key:'football-nor-toppserien',season:'2026',group:''});
 const url=new URL(screen.getByRole('link',{name:'← Back'}).getAttribute('href'),'https://ninkosports.com');
 expect(url.pathname).toBe('/scores/competition/football-nor-toppserien/standings');
 expect(url.searchParams.get('tab')).toBe('scorers');expect(url.searchParams.get('season')).toBe('2026');
 expect(screen.queryByText('Recorded match performance')).toBeNull();
});
