import React from 'react';
import {render,screen,waitFor,cleanup,act} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {it,expect,vi,afterEach} from 'vitest';
import {NewsEntityProvider,NewsEntityText,NewsArticleLinks} from './NewsEntityContext.jsx';
const a={id:5,slug:'bruno-story',sport:'football'};
const entity={kind:'player',id:'422685',name:'Bruno Fernandes',aliases:['Bruno Fernandes'],href:'/players/422685?event_id=match-1'};
const data={slug:a.slug,article_id:a.id,sport:'football',teams:[],players:[entity],matches:[]};
const body=(article=a)=><MemoryRouter><NewsEntityProvider article={article}><p><NewsEntityText text="Bruno Fernandes made a statement."/></p><NewsArticleLinks/></NewsEntityProvider></MemoryRouter>;
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();});
it('the article is readable before context loads; verified links appear without rewriting it',async()=>{
 let resolve;vi.stubGlobal('fetch',vi.fn(()=>new Promise(r=>{resolve=r;})));
 render(body());expect(screen.getByText('Bruno Fernandes made a statement.')).toBeTruthy();expect(screen.queryByRole('link')).toBeNull();
 resolve({ok:true,json:async()=>data});
 expect(await screen.findByRole('link',{name:'Bruno Fernandes'})).toBeTruthy();
 expect(screen.getByText(/made a statement/).textContent).toBe('Bruno Fernandes made a statement.');
});
it('another article response cannot add identities to the current article',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({...data,article_id:10})}));render(body());
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));expect(screen.queryByRole('link')).toBeNull();
});
it('navigation cancels old context and never resurrects it',async()=>{
 let first;const f=vi.fn().mockImplementationOnce(()=>new Promise(r=>{first=r;})).mockResolvedValueOnce({ok:true,json:async()=>({...data,article_id:6,slug:'new-story',players:[]})});vi.stubGlobal('fetch',f);
 const {rerender}=render(body());rerender(body({...a,id:6,slug:'new-story'}));
 first({ok:true,json:async()=>data});await waitFor(()=>expect(f).toHaveBeenCalledTimes(2));
 expect(f.mock.calls[0][1].signal.aborted).toBe(true);expect(screen.queryByRole('link')).toBeNull();
});
it('a data outage cannot replace the article with an error page or a spinner',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));render(body());await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
 expect(screen.getByText('Bruno Fernandes made a statement.')).toBeTruthy();expect(screen.queryByRole('alert')).toBeNull();
});
it('does not fetch profile data for other sports or a partial article',()=>{
 vi.stubGlobal('fetch',vi.fn());render(body({...a,sport:'basketball'}));expect(fetch).not.toHaveBeenCalled();
});
it('a short context outage retries without adding a refresh control or changing the article',async()=>{
 vi.useFakeTimers();
 const f=vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce({ok:true,json:async()=>data});
 vi.stubGlobal('fetch',f);render(body());
 await act(async()=>{await vi.advanceTimersByTimeAsync(1600);});
 expect(f).toHaveBeenCalledTimes(2);
 expect(screen.getByRole('link',{name:'Bruno Fernandes'})).toBeTruthy();
 expect(screen.queryByRole('button')).toBeNull();
 vi.useRealTimers();
});
it('a permanently unavailable context never loops or produces fake profile links',async()=>{
 vi.useFakeTimers();const f=vi.fn().mockResolvedValue({ok:false,status:404});vi.stubGlobal('fetch',f);
 render(body());await act(async()=>{await vi.advanceTimersByTimeAsync(65000);});
 expect(f).toHaveBeenCalledTimes(1);expect(screen.queryByRole('link')).toBeNull();
 expect(screen.getByText('Bruno Fernandes made a statement.')).toBeTruthy();
 vi.useRealTimers();
});
