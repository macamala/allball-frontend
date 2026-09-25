import {it,expect} from 'vitest';
import {matchClock,newerMatchEvent} from './matchClock.js';
const now=Date.parse('2026-09-25T08:10:00Z');
const event={id:'one',sport:'football',status:'live',live:true,live_class:'CONFIRMED_LIVE',start_time:'2026-09-25T07:00:00Z',score_observed_at:new Date(now).toISOString(),score:{home:0,away:0,minute:'12'}};
it('ticks a labelled estimate without changing score or state',()=>{const raw=JSON.stringify(event);expect(matchClock(event,now+25000).label).toBe('≈12:25');expect(matchClock(event,now+65000).label).toBe('≈13:05');expect(JSON.stringify(event)).toBe(raw);});
it.each(['finished','break','halftime','scheduled','suspended','postponed'])('does not run in %s',status=>expect(matchClock({...event,status},now+5000).label).toBeNull());
it('never runs away for four minutes or invents a kickoff',()=>{expect(matchClock(event,now+240000)).toMatchObject({label:null,delayed:true});expect(matchClock({...event,score_observed_at:null},now).label).toBeNull();expect(matchClock({...event,score:{minute:null}},now).label).toBeNull();});
it('does not invent a second half from a first half clock',()=>expect(matchClock({...event,score:{minute:44}},now+89000).label).toBe('≈45:00'));
it('retains a newer final when an older response arrives',()=>{const previous={...event,status:'finished',live:false,score_observed_at:new Date(now+20000).toISOString()};expect(newerMatchEvent(previous,event).status).toBe('finished');});
it.each(['11\u200e’\u200e', '\u206611’\u2069', '11\u200f\''])('understands native direction-marked minute %s', minute=>{
  expect(matchClock({...event,score:{...event.score,minute}},now+2000).label).toBe('≈11:02');
});
it('uses elapsed native seconds rather than jumping ahead to the ordinal minute',()=>{
  expect(matchClock({...event,score:{minute:'11\u200e’\u200e',clock:'10:28'}},now+2000).label).toBe('≈10:30');
});
it('handles added time from a native seconds anchor without making it a new half',()=>{
  expect(matchClock({...event,score:{minute:"45+2'",clock:'46:10'}},now+2000).label).toBe('≈45+1:12');
});
