import React from 'react';
import {render,screen,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,it,expect,vi} from 'vitest';
import {I18nProvider} from '../context/I18nContext.jsx';
import HomePage from './HomePage.jsx';
const mocks=vi.hoisted(()=>({getPortalHome:vi.fn()}));
vi.mock('../api.js',()=>({peekPortalHome:()=>null,getPortalHome:mocks.getPortalHome}));
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({favorites:{sports:[],leagues:[]}})}));
afterEach(cleanup);
it('home is editorial only even when the portal payload contains live results',async()=>{
  mocks.getPortalHome.mockResolvedValue({featured:[{id:1,slug:'news',title:'Football news story',sport:'football'}],latest:[],sports_data:{connected:true,events:[{id:'match',sport:'football',home:{name:'Unexpected Home Team'},away:{name:'Away'},status:'live',score:{home:0,away:0}}]}});
  const {container}=render(<I18nProvider><MemoryRouter><HomePage/></MemoryRouter></I18nProvider>);
  await waitFor(()=>expect(screen.getAllByText('Football news story').length).toBeGreaterThan(0));
  expect(screen.queryByText('Unexpected Home Team')).toBeNull();expect(container.querySelector('.portal-rail')).toBeNull();
});
