import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import TopScorersPanel from './TopScorersPanel.jsx';
const mock=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('../../api.js',()=>({getJSON:mock.get}));
vi.mock('../../hooks/useVisiblePoll.js',()=>({default:()=>{}}));
const rows=[{player_id:'7',name:'Player A',team_id:'1',team:'Alpha',rank:1,goals:5,penalties:1,appearances:3},{player_id:'8',name:'Player B',team_id:'2',team:'Beta',rank:2,goals:4,penalties:0,appearances:5}];
beforeEach(()=>mock.get.mockReset().mockResolvedValue({available:true,season:'2026',rows}));afterEach(cleanup);
it('shows confirmed season scorers, goals and real player and club links',async()=>{
 render(<MemoryRouter><TopScorersPanel competitionKey="league" season="2026"/></MemoryRouter>);await screen.findByText('Player A');
 expect(mock.get).toHaveBeenCalledWith('/sports-data/competitions/league/scorers?season=2026');
 expect(screen.getByRole('link',{name:'Player A'}).getAttribute('href')).toContain('/players/7');expect(screen.getByRole('link',{name:'Alpha'}).getAttribute('href')).toContain('/teams/1');
 expect(screen.getByText('5')).toBeTruthy();fireEvent.change(screen.getByLabelText('Scorer team'),{target:{value:'2'}});expect(screen.queryByText('Player A')).toBeNull();expect(screen.getByText('Player B')).toBeTruthy();
});
it('does not substitute another league list when a group is unsupported',async()=>{
 mock.get.mockResolvedValue({available:false,rows:[]});render(<MemoryRouter><TopScorersPanel competitionKey="league" group="Group A"/></MemoryRouter>);
 await screen.findByText('A verified scorer list is not yet available for this competition, group and season.');expect(screen.queryByRole('list')).toBeNull();expect(mock.get).toHaveBeenCalledWith('/sports-data/competitions/league/scorers?group=Group+A');
});
