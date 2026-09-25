import {describe,it,expect} from 'vitest';
import {orderCompetitionGroups,competitionFamily} from './competitionOrder.js';
const g=(key,group,hasLive=false)=>({key,identity_key:`football::${key}::${group}`,sport:'football',competition:group,group,hasLive,events:[{sport:'football',competition_key:key,competition_name:group,group}]});
describe('editorial competition ordering',()=>{
  it('keeps all UEFA Nations League groups adjacent above a lower live league without merging tables',()=>{
    const a=g('uefa-nations-league','UEFA Nations League A Grp. 2'), d=g('football-int-9809','UEFA Nations League D Grp. 1',true), b=g('uefa-nations-league','UEFA Nations League B Grp. 3');
    const lesser=g('germany-3-liga','3. Liga',true), other=g('england-national-league','National League');
    const rows=orderCompetitionGroups([a,lesser,other,b,d]);
    expect(rows.slice(0,3)).toEqual([a,b,d]);expect(new Set(rows.map(r=>r.identity_key)).size).toBe(5);
    expect(competitionFamily(other)).not.toBe(competitionFamily(a));
  });
  it('honors favorites as whole families and keeps confederations distinct',()=>{
    const u=g('uefa-nations-league','UEFA Nations League A Grp. 1'),c=g('concacaf-nations-league','CONCACAF Nations League A Grp. 1'),l=g('local','Local');
    expect(orderCompetitionGroups([u,c,l],{leagues:['local']})[0]).toBe(l);
    expect(competitionFamily(u)).not.toBe(competitionFamily(c));
  });
  it('orders major leagues before an earlier minor fixture and is input-order independent',()=>{
    const p=g('england-premier-league','Premier League'),l=g('minor','Local',true);
    expect(orderCompetitionGroups([l,p])).toEqual(orderCompetitionGroups([p,l]));expect(orderCompetitionGroups([l,p])[0]).toBe(p);
  });
});
