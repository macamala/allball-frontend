import {describe,it,expect} from 'vitest';
import {matchPayloadMatches,uniqueStatistics,incidentMinute,incidentPeriod,footballIncidentKind,formationBands} from './matchDetail.js';
describe('match response ownership and canonical old links',()=>{
  it('accepts the explicit request envelope without confusing canonical and requested IDs',()=>{
    expect(matchPayloadMatches({id:'old',event:{id:'canonical'},header:{id:'canonical'}},'old')).toBe(true);
    expect(matchPayloadMatches({event:{id:'canonical'}},'old')).toBe(false);
    expect(matchPayloadMatches({id:'other',event:{id:'old'}},'old')).toBe(false);
    expect(matchPayloadMatches({id:'old',event:{id:'one'},header:{id:'two'}},'old')).toBe(false);
    expect(matchPayloadMatches({event:{id:'old'}},'old')).toBe(true);
  });
});
describe('real statistics and event time',()=>{
  it('removes headers and duplicate metrics without dropping zero',()=>{
    expect(uniqueStatistics([{label:'Shots',home:null,away:null},{label:'Total shots',home:0,away:0},{label:'total shots',home:0,away:0}])).toEqual([{label:'Total shots',home:0,away:0}]);
  });
  it.each([[45,2,'45+2’'],[90,4,'90+4’'],['90+4',4,'90+4’'],[0,0,'0’'],[null,0,'']])('formats %s plus %s faithfully', (minute,stoppage,expected)=>expect(incidentMinute({minute,stoppage})).toBe(expected));
  it('keeps first-half added time and explicit extra time separate',()=>{
    expect(incidentPeriod({minute:'45+3'})).toBe('first');
    expect(incidentPeriod({minute:95})).toBe('second');
    expect(incidentPeriod({minute:100,period:'3'})).toBe('extra_first');
    expect(incidentPeriod({period:'penalties'})).toBe('penalties');
    expect(footballIncidentKind({family:'card',type:'red_card'})).toBe('red-card');
    expect(footballIncidentKind({family:'card',type:'second_yellow'})).toBe('red-card');
  });
});
describe('formation geometry cannot be guessed',()=>{
  const start=Array.from({length:11},(_,i)=>({id:i,name:`Player ${i}`}));
  it('uses the exact supplied formation',()=>expect(formationBands({formation:'4-2-3-1',start}).map(r=>r.length)).toEqual([1,4,2,3,1]));
  it.each(['','unknown','4-4-2-5'])('keeps %s as a roster, not a made-up pitch',formation=>expect(formationBands({formation,start})).toEqual([]));
  it('uses supplied geometry even when the roster order differs',()=>{
    const a={name:'Keeper',pitch_position:{x:.5,y:.1}},b={name:'Left',pitch_position:{x:.2,y:.5}},c={name:'Right',pitch_position:{x:.8,y:.5}};
    expect(formationBands({start:[c,a,b]})).toEqual([[a],[b,c]]);
  });
});
