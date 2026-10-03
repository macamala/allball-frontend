import {it,expect,vi} from 'vitest';
import {newsDataKeys,scopedNewsData,readNewsData} from './newsFootballData.js';
const key='usa-usl-championship',alias='football-usa-usl-championship';
const data=(id,rows=[])=>({competition:{id,sport:'football',country_id:'us'},season:'2026',rows});
it('accepts only the audited country-qualified USL equivalence',()=>{
  expect(newsDataKeys(key)).toEqual([key,alias]);
  for(const id of ['football-usl-championship','football-usa-usl-league-one','england-championship','football-sco-championship'])expect(scopedNewsData(data(id),key)).toBeNull();
});
it('fills the empty News table with actual existing Eastern and Western groups',async()=>{
  const saved=data(alias,[{team:'Tampa Bay Rowdies',group:'USL Championship Eastern',points:52},{team:'Sacramento Republic',group:'USL Championship Western',points:44}]);
  const get=vi.fn().mockResolvedValueOnce(data(key)).mockResolvedValueOnce(saved);
  const result=await readNewsData(get,key,'standings');expect(result).toBe(saved);expect(result.rows.map(r=>r.group)).toEqual(['USL Championship Eastern','USL Championship Western']);
  expect(get.mock.calls.map(c=>c[0])).toEqual(['/sports-data/standings?league='+key,'/sports-data/standings?league='+alias]);
  expect(result.rows[0].goals_for).toBeUndefined();
});
it('never overwrites populated canonical data with an alias',async()=>{
  const saved=data(key,[{team:'Club',points:1}]);const get=vi.fn().mockResolvedValue(saved);
  expect(await readNewsData(get,key,'standings')).toBe(saved);expect(get).toHaveBeenCalledTimes(1);
});
it('rejects a wrong explicit sport despite the matching key',()=>{
  expect(scopedNewsData({...data(alias),sport:'basketball'},key)).toBeNull();
});
it('never substitutes the previous season for a requested current table',async()=>{
  const get=vi.fn().mockResolvedValue({...data(alias,[{team:'Old',points:1}]),season:'2025'});
  await expect(readNewsData(get,key,'standings',{season:'2026'})).rejects.toThrow();
});
