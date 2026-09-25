import {describe,it,expect} from 'vitest';
import {matchBucket,filteredMatches,mutualSummary} from './competitionHub.js';
const now=Date.now();
const fixture=(key,status,time)=>({key,status,start_time:new Date(now+time).toISOString(),round:'2',home:{id:'1',name:'Alpha'},away:{id:'2',name:'Beta'}});
it('sorts past results newest first, upcoming earliest first and separates cancelled',()=>{
 const events=[fixture('future2','scheduled',200000),fixture('past1','finished',-500000),fixture('future1','scheduled',100000),fixture('past2','finished',-200000),fixture('cancelled','cancelled',200000)];
 expect(filteredMatches(events,{view:'fixtures',now}).map(e=>e.key)).toEqual(['future1','future2']);
 expect(filteredMatches(events,{view:'results',now}).map(e=>e.key)).toEqual(['past2','past1']);
 expect(filteredMatches(events,{view:'other',now}).map(e=>e.key)).toEqual(['cancelled']);
});
it('filters exact team and round without changing the source list',()=>{
 const events=[fixture('a','scheduled',100000),{...fixture('b','scheduled',100000),round:'3'}, {...fixture('c','scheduled',100000),home:{name:'Alpha U21'},away:{name:'Delta'}}];
 const old=JSON.stringify(events);
 expect(filteredMatches(events,{team:'alpha',round:'2',now}).map(e=>e.key)).toEqual(['a']);expect(JSON.stringify(events)).toBe(old);
});
it.each(['cancelled','postponed','suspended','awaiting_confirmation'])('does not invent a fixture or a played result from %s',status=>expect(matchBucket(fixture('x',status,100000),now)).toBe('other'));
it('H2H totals account for reversed home/away and ignore null scores or unrelated opponents',()=>{
 const event=fixture('x','scheduled',100000);
 const rows=[{...event,score:{home:2,away:0}}, {...event,home:event.away,away:event.home,score:{home:3,away:1}}, {...event,score:{home:1,away:1}}, {...event,score:{home:null,away:null}}, {...event,away:{name:'Wrong'},score:{home:8,away:0}}];
 expect(mutualSummary(event,rows)).toEqual({home:1,draws:1,away:1,total:3,homeGoals:4,awayGoals:4});
});
