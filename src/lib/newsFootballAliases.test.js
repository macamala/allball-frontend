import {it,expect,vi} from 'vitest';
import {newsDataKeys,scopedNewsData,readNewsData,newsMatches,newsDataPhase} from './newsFootballData.js';
const mex='mexico-liga-expansion',women='uefa-womens-champions-league';
const mk='football-mex-liga-de-expansion-mx-apertura',wk='football-women-s-champions-league';
const payload=(id,extra={})=>({competition:{id,sport:'football'},season:'2026/2027',rows:[],events:[],...extra});
it('keeps the canonical menu first and allows only its explicitly verified fallback',()=>{
  expect(newsDataKeys(mex)).toEqual([mex,mk]);expect(newsDataKeys(women)).toEqual([women,wk]);
  for(const wrong of ['mexico-liga-mx','football-mex-liga-de-expansion-mx-clausura','uefa-champions-league','football-women-s-world-cup-u20']){
    expect(scopedNewsData(payload(wrong),mex)).toBeNull();expect(scopedNewsData(payload(wrong),women)).toBeNull();
  }
});
it('uses a real retained table, preserves season and does not zero-fill missing statistics',async()=>{
  const saved=payload(mk,{rows:[{team:'Atletico Morelia',points:21}]});
  const get=vi.fn().mockResolvedValueOnce(payload(mex)).mockResolvedValueOnce(saved);
  const result=await readNewsData(get,mex,'standings');expect(result).toBe(saved);
  expect(result.rows[0].goals_for).toBeUndefined();expect(result.season).toBe('2026/2027');
  expect(get.mock.calls.map(c=>c[0])).toEqual(['/sports-data/standings?league='+mex,'/sports-data/standings?league='+mk]);
});
it('never replaces a populated canonical table with a different source phase',async()=>{
  const saved=payload(mex,{rows:[{team:'Club',points:2}]});const get=vi.fn().mockResolvedValue(saved);
  expect(await readNewsData(get,mex,'standings')).toBe(saved);expect(get).toHaveBeenCalledTimes(1);
});
it('retains a visible Apertura phase only on its exact accepted payload',()=>{
  expect(newsDataPhase(payload(mk),mex)).toBe('Apertura');
  for(const [key,menu] of [[mex,mex],[wk,women],[mk,women],['football-mex-liga-de-expansion-mx-clausura',mex]])expect(newsDataPhase(payload(key),menu)).toBeNull();
});
it('never mixes womens alias matches with men, other competitions, or another requested season',()=>{
  const event=(id,extra={})=>({id,key:id,sport:'football',competition_key:wk,football_gender:'women',season:'2026/2027',start_time:'2026-09-22T16:45:00Z',status:'finished',home:{name:'Bayern (W)'},away:{name:'Man City (W)'},...extra});
  const data=payload(wk,{events:[event('yes'),event('man',{football_gender:'men'}),event('old',{season:'2025/2026'}),event('other',{competition_key:'uefa-champions-league'})]});
  expect(newsMatches(data,women,{season:'2026/2027'}).map(e=>e.id)).toEqual(['yes']);
  expect(newsMatches(data,'uefa-champions-league')).toEqual([]);
});
it('rejects another season instead of silently returning it through the new fallback',async()=>{
  const get=vi.fn().mockResolvedValue(payload(mk,{season:'2025/2026',rows:[{team:'Old',points:5}]}));
  await expect(readNewsData(get,mex,'standings',{season:'2026/2027'})).rejects.toThrow();
});
