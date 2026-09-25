import React from 'react';
import {render,screen,fireEvent,within,waitFor,cleanup,act} from '@testing-library/react';
import {MemoryRouter,useLocation,Link} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {I18nProvider} from '../../context/I18nContext.jsx';
import CompetitionHubPanels from './CompetitionHubPanels.jsx';
import HeadToHeadPanel from './HeadToHeadPanel.jsx';
const mocks=vi.hoisted(()=>({get:vi.fn(),polls:[]}));
vi.mock('../../api.js',()=>({getJSON:mocks.get}));
vi.mock('../../hooks/useVisiblePoll.js',()=>({default:(cb,ms)=>{mocks.polls.push({cb,ms});}}));
const at=(days)=>new Date(Date.now()+days*86400000).toISOString();
const match=(key,days,status='scheduled',extra={})=>({key,id:key.startsWith('reference:')?null:key,sport:'football',status,round:'1',start_time:at(days),home:{id:'1',name:'Alpha'},away:{id:'2',name:'Beta'},score:{home:null,away:null},...extra});
const events=[match('linked',1),match('reference:103',2,'scheduled',{away:{id:'3',name:'Gamma'},round:'2'}),match('past',-3,'finished',{score:{home:2,away:1}})];
const table=[{team:'Alpha',team_id:'1',played:2,points:6},{team:'Beta',team_id:'2',played:2,points:0}];
const data={available:true,events,groups:[],table_views:{home:table,away:table},coverage:{listed:3}};
function Location(){return <output data-testid="where">{useLocation().pathname+useLocation().search}</output>;}
function view(path='/scores/competition/test/standings'){
 return render(<I18nProvider><MemoryRouter initialEntries={[path]}><Location/><Link to="?tab=fixtures&season=1999">Old season</Link><CompetitionHubPanels competitionKey="test" sport="football" group="" season="" meta={{}}><section data-testid="original-table">Original scoped table</section></CompetitionHubPanels></MemoryRouter></I18nProvider>);
}
beforeEach(()=>{mocks.polls=[];mocks.get.mockReset().mockImplementation(async url=>url.includes('/comparison?')?{available:true,event:events[0],h2h:[events[2]],form:{}}:data);});
afterEach(cleanup);
it('defaults to the table with next and previous previews without opening or comparing the first match',async()=>{
 view();await screen.findByText('Next matches');await waitFor(()=>expect(screen.getAllByRole('button',{name:/H2H:/}).length).toBe(3));
 expect(screen.getByTestId('original-table')).toBeTruthy();
 expect(mocks.get.mock.calls.every(([url])=>url.includes('/hub'))).toBe(true);
 expect(screen.getByRole('tab',{name:'Standings'}).getAttribute('aria-selected')).toBe('true');
 expect(screen.getAllByRole('link',{name:'Open match: Alpha vs Beta'}).map(e=>e.getAttribute('href'))).toContain('/scores/event/linked');
 expect(screen.queryByRole('link',{name:'Open match: Alpha vs Gamma'})).toBeNull();
});
it('fixtures, results and exact team/round filters are connected and bookmarkable',async()=>{
 view('?tab=fixtures');await screen.findByRole('combobox',{name:'Filter team'});
 await waitFor(()=>expect(document.querySelectorAll('.hub-fixture-row').length).toBe(2));
 fireEvent.change(screen.getByRole('combobox',{name:'Filter round'}),{target:{value:'2'}});
 expect(document.querySelectorAll('.hub-fixture-row').length).toBe(1);expect(screen.getByTestId('where').textContent).toContain('round=2');
 fireEvent.change(screen.getByRole('combobox',{name:'Filter round'}),{target:{value:''}});
 fireEvent.click(screen.getByRole('tab',{name:/Results/}));
 expect(document.querySelectorAll('.hub-fixture-row').length).toBe(1);expect(screen.getByText('FT')).toBeTruthy();
});
it('H2H tab starts empty, and only an explicit pair selection requests its history',async()=>{
 view('?tab=h2h');await screen.findByRole('combobox',{name:'Compare match'});
 expect(mocks.get.mock.calls.some(([url])=>url.includes('/comparison'))).toBe(false);
 fireEvent.change(screen.getByRole('combobox',{name:'Compare match'}),{target:{value:'linked'}});
 await screen.findByText('Head-to-head record');
 expect(mocks.get).toHaveBeenCalledWith('/sports-data/competitions/test/comparison?match=linked');
 expect(screen.getByTestId('where').textContent).toContain('match=linked');
 expect(screen.getByRole('link',{name:/Open the selected match/}).getAttribute('href')).toBe('/scores/event/linked');
});
it('source-only fixtures compare without inventing an app match link',async()=>{
 mocks.get.mockImplementation(async url=>url.includes('/comparison?')?{available:true,event:events[1],h2h:[],form:{}}:data);
 view('?tab=fixtures');fireEvent.click(await screen.findByRole('button',{name:'H2H: Alpha vs Gamma'}));
 await screen.findByText('Head-to-head record');expect(mocks.get).toHaveBeenCalledWith('/sports-data/competitions/test/comparison?match=reference%3A103');
 expect(screen.queryByRole('link',{name:/Open the selected match/})).toBeNull();
});
it('uses supplied home/away tables but keeps original overall table',async()=>{
 view();fireEvent.click(await screen.findByRole('button',{name:'Home',exact:true}));
 expect(screen.queryByTestId('original-table')).toBeNull();expect(screen.getByRole('table')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Overall'}));expect(screen.getByTestId('original-table')).toBeTruthy();
});
it('does not show home/away table controls when split data is unavailable',async()=>{
 mocks.get.mockResolvedValue({...data,table_views:{}});view();await waitFor(()=>expect(document.querySelectorAll('.hub-fixture-row').length).toBe(3));
 expect(screen.queryByRole('button',{name:'Home',exact:true})).toBeNull();
});
it('shows honest empty history instead of another pair or current game',async()=>{
 mocks.get.mockImplementation(async url=>url.includes('/comparison?')?{available:false,event:null,h2h:[],form:{}}:data);
 view('?tab=h2h&match=unrelated');await screen.findByText('This match is not verified in the selected competition, group or season.');
 expect(screen.queryByText('Head-to-head record')).toBeNull();
});
it('recent form includes opponents and scores; venue summary recomputes reversed fixtures',()=>{
 const historical=[events[2],{...events[2],id:null,start_time:at(-10),home:events[2].away,away:events[2].home,score:{home:3,away:1}}];
 render(<I18nProvider><MemoryRouter><HeadToHeadPanel event={events[0]} h2h={historical} form={{home:{results:[{...historical[0],outcome:'W'}]}}}/></MemoryRouter></I18nProvider>);
 expect(screen.getByText(/2 verified prior meetings · Goals 3:4/)).toBeTruthy();
 fireEvent.change(screen.getByRole('combobox',{name:'Head-to-head venue'}),{target:{value:'home'}});
 expect(screen.getByText(/1 verified prior meetings · Goals 2:1/)).toBeTruthy();expect(screen.getByTitle('Win')).toBeTruthy();
});
