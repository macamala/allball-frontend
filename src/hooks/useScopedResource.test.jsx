import {renderHook,act,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import useScopedResource from './useScopedResource.js';
const get=vi.hoisted(()=>vi.fn());
vi.mock('../api.js',()=>({getJSON:get}));
vi.mock('./useVisiblePoll.js',()=>({default:()=>{}}));
afterEach(()=>{cleanup();get.mockReset();});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
it('does not fetch a null selection',()=>{renderHook(()=>useScopedResource(null));expect(get).not.toHaveBeenCalled();});
it('ignores old A -> B -> A visit responses',async()=>{
 const a=deferred(),b=deferred(),newA=deferred();get.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(newA.promise);
 const {result,rerender}=renderHook(({path})=>useScopedResource(path),{initialProps:{path:'A'}});
 rerender({path:'B'});rerender({path:'A'});
 await act(async()=>newA.resolve({version:'new A'}));await act(async()=>{a.resolve({version:'old A'});b.resolve({version:'B'});});
 expect(result.current.data).toEqual({version:'new A'});
});
it('retains the last good response on refresh failure and permits retry',async()=>{
 get.mockResolvedValueOnce({rows:2}).mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce({rows:3});
 const {result}=renderHook(()=>useScopedResource('table'));await waitFor(()=>expect(result.current.data).toEqual({rows:2}));
 await act(async()=>result.current.refresh());expect(result.current.error).toBe(true);expect(result.current.data).toEqual({rows:2});
 await act(async()=>result.current.refresh());expect(result.current.error).toBe(false);expect(result.current.data).toEqual({rows:3});
});
