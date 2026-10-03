import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {it,expect,afterEach,vi} from 'vitest';
import StandingsTable from './StandingsTable.jsx';
vi.mock('../context/I18nContext.jsx',()=>({useI18n:()=>({lang:'en'})}));
afterEach(cleanup);
const rows=[{rank:1,team:'Club A',team_id:'news-source:123',played:1,points:3,logo:'https://images.example/123.png'}];
it('News-only supplemental identities do not link to nonexistent internal profiles',()=>{
 render(<MemoryRouter><StandingsTable rows={rows} sport="football" competition="serbia-prva-liga" teamLinks={false}/></MemoryRouter>);
 expect(screen.getByText('Club A')).toBeTruthy();expect(screen.queryAllByRole('link')).toHaveLength(0);expect(screen.getByRole('table').querySelector('img').src).toBe(rows[0].logo);
});
it('existing callers keep team-profile links by default',()=>{
 render(<MemoryRouter><StandingsTable rows={rows} sport="football" competition="serbia-prva-liga"/></MemoryRouter>);
 expect(screen.getByRole('link',{name:'Club A'}).getAttribute('href')).toContain('/teams/');
});
