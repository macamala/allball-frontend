import { it, expect, vi } from 'vitest';
import { newsDateRange, localNewsDate, seasonIdentity, sameNewsSeason, decorateNewsIdentity, newsDataNotice } from './newsFootballView.js';
import { readNewsDateRange, readNewsData, newsMatches, newsMatchBucket } from './newsFootballData.js';
import { clearNewsDataCache, peekNewsData, rememberNewsData } from './newsFootballCache.js';
const key = 'england-championship';
const board = (extra={}) => ({competition:{id:key,sport:'football'},events:[],...extra});
const event = (id, extra={}) => ({ id, key:id, competition_key:key,sport:'football',start_time:'2026-10-03T15:00:00Z',status:'finished',
  home:{name:'Blackburn Rovers FC'},away:{name:'Derby County FC'},score:{home:0,away:2},...extra });
const range = newsDateRange('2026-10-03','2026-10-03');
const response = (events,extra={})=>({sport:'football',competition:key,connected:true,events,snapshot:{date_from:range.from,date_to:range.to,count:events.length,complete:true},...extra});

it.each(['2026-2027','2026/2027','2026/27'])('normalizes explicitly equivalent season %s without inventing one',value=>{
 expect(seasonIdentity(value)).toBe('2026/2027'); expect(sameNewsSeason(value,'2026/2027')).toBe(true);
 expect(sameNewsSeason(null,value)).toBe(false); expect(sameNewsSeason('2025/2026',value)).toBe(false);
});
it('does not merge different seasons, stages or calendar-year competitions',()=>{
 expect(seasonIdentity('2026')).toBe('2026');expect(seasonIdentity('2026 Apertura')).toBe('2026 Apertura');
 expect(sameNewsSeason('2026-2028','2026/2027')).toBe(false);expect(sameNewsSeason('2026 Clausura','2026 Apertura')).toBe(false);
});
it.each([['2026-02-30','2026-03-01'],['2026-10-05','2026-10-03'],['2026-01-01','2026-12-31'],['','2026-10-03']])('rejects invalid/unbounded range %s to %s',(a,b)=>{expect(()=>newsDateRange(a,b)).toThrow();});
it('uses local calendar boundaries, including the DST transition, not fixed 24-hour offsets',()=>{
 const d=new Date(2026,9,4); const r=newsDateRange('2026-10-04','2026-10-04');
 expect(r.start).toBe(d.getTime());expect(r.end).toBe(new Date(2026,9,5).getTime());
 expect(localNewsDate(new Date(r.end-1))).toBe('2026-10-04');
});
it('reads exactly the selected UTC boundaries and filters foreign and out-of-window matches',async()=>{
 const included=event('inside',{start_time:new Date(range.start+3600000).toISOString()});
 const get=vi.fn().mockResolvedValue(response([included,event('before',{start_time:new Date(range.start-1).toISOString()}),event('foreign',{competition_key:'spain-la-liga'})]));
 const result=await readNewsDateRange(get,key,range);
 expect(result.events.map(r=>r.id)).toEqual(['inside']);expect(result._newsRead.partial).toBe(false);
 const q=new URLSearchParams(get.mock.calls[0][0].split('?')[1]);expect(q.get('date_from')).toBe(range.from);expect(q.get('date_to')).toBe(range.to);expect(q.get('unlimited')).toBeNull();
});
it.each([false,undefined])('labels a non-complete stored response %s as partial rather than full league coverage',async complete=>{
 const get=vi.fn().mockResolvedValue(response([],{snapshot:{date_from:range.from,date_to:range.to,count:0,complete}}));
 const result=await readNewsDateRange(get,key,range);expect(result._newsRead.partial).toBe(true);expect(newsDataNotice(result,'fixtures')).toContain('part of the requested data');
});
it('rejects another date scope instead of storing it in the selected window',async()=>{
 const get=vi.fn().mockResolvedValue(response([],{snapshot:{date_from:'2000-01-01',date_to:range.to,count:0,complete:true}}));
 await expect(readNewsDateRange(get,key,range)).rejects.toThrow('scope');
});
it('a complete zero-record snapshot really is empty, never resurrected from an old range',async()=>{
 const d=await readNewsDateRange(vi.fn().mockResolvedValue(response([])),key,range);
 expect(d.events).toEqual([]);expect(d._newsRead.partial).toBe(false);
});
it('keeps date-window cache keys separate and rejects a mismatched range payload',()=>{
 clearNewsDataCache();const data=board({_newsRead:{rangeKey:range.key},events:[event('saved')]});
 expect(rememberNewsData(key,'fixtures','',data,100,range.key)).toBe(true);
 expect(peekNewsData(key,'results','',100,range.key).data.events).toHaveLength(1);
 expect(peekNewsData(key,'results','',100)).toBeNull();
 expect(rememberNewsData(key,'fixtures','',data,100,'different')).toBe(false);
});
it('cancels promptly even when the transport ignores AbortSignal',async()=>{
 const controller=new AbortController();const get=vi.fn(()=>new Promise(()=>{}));
 const request=readNewsData(get,key,'fixtures',{signal:controller.signal});controller.abort();
 await expect(request).rejects.toMatchObject({name:'AbortError'});expect(get).toHaveBeenCalledTimes(1);
});
it('a frozen live status is awaiting confirmation, never guessed as FT or updated live',()=>{
 const now=Date.parse('2026-10-03T15:00:00Z');
 expect(newsMatchBucket(event('old',{status:'live',updated_at:'2026-10-02T12:00:00Z'}),now)).toBe('other');
 expect(newsMatchBucket(event('fresh',{status:'live',updated_at:'2026-10-03T14:59:00Z'}),now)).toBe('fixtures');
});
it('matching season formats retain real events while unlabelled season records stay unlabelled',()=>{
 const d=board({events:[event('a',{season:'2026-2027'}),event('b',{season:null}),event('c',{season:'2025/2026'})]});
 expect(newsMatches(d,key,{season:'2026/2027'}).map(e=>e.id)).toEqual(['a']);expect(d.events[1].season).toBeNull();
});
it('reuses verified same-club crests without modifying scores, names, time or input',()=>{
 const logo='https://images.example/blackburn.png';const d=board({teams:[{id:'8655',name:'Blackburn Rovers',logo}],events:[event('saved')]});
 const original=JSON.stringify(d);const result=decorateNewsIdentity(d);
 expect(result.events[0].home.logo).toBe(logo);expect(result.events[0].score).toEqual({home:0,away:2});
 expect(result.events[0].start_time).toBe(d.events[0].start_time);expect(JSON.stringify(d)).toBe(original);
});
it('does not reuse another team, gender, duplicate identity or unsafe crest URL',()=>{
 for(const teams of [
   [{id:1,name:'Blackburn Rovers Women',logo:'https://images.example/women.png'}],
   [{id:1,name:'Blackburn Rovers',logo:'https://images.example/one.png'},{id:2,name:'Blackburn Rovers',logo:'https://images.example/two.png'}],
   [{id:1,name:'Blackburn Rovers',logo:'javascript:alert(1)'}],
 ]) expect(decorateNewsIdentity(board({events:[event('a')],teams})).events[0].home.logo).toBeUndefined();
});
it('does not use another league or season as supplementary evidence for crests',()=>{
 const d=board({season:'2026/2027',events:[event('a')]});
 for(const extra of [board({competition:{id:'spain-la-liga'},teams:[{name:'Blackburn Rovers',logo:'https://example.com/logo.png'}]}),
   board({season:'2025/2026',teams:[{name:'Blackburn Rovers',logo:'https://example.com/logo.png'}]})])
   expect(decorateNewsIdentity(d,extra).events[0].home.logo).toBeUndefined();
});
it('keeps standings groups and actual statistics unchanged while mapping known field synonyms',()=>{
 const rows=[{team:'Arsenal',group:'A',won:2,drawn:1,lost:0,points:7},{team:'Arsenal',group:'B',won:1,points:3}];
 const data=decorateNewsIdentity(board({rows}));expect(data.rows).toHaveLength(2);expect(data.rows[0].wins).toBe(2);expect(data.rows[1].goals_for).toBeUndefined();
 expect(data.rows.map(r=>r.points)).toEqual([7,3]);expect(data.rows.map(r=>r.group)).toEqual(['A','B']);
});
it('missing tables remain missing rather than computed from incomplete final scores',()=>{
 const d=board({rows:[],events:[event('a')]});expect(decorateNewsIdentity(d).rows).toEqual([]);expect(newsDataNotice(d,'standings')).toContain('No table is calculated');
});
