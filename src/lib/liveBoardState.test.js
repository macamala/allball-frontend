import { describe, it, expect } from 'vitest';
import { rawPayloadRows, stabilizeDayPayload } from './liveBoardState.js';
const rows=Array.from({length:40},(_,i)=>({id:String(i),sport:'football',status:'scheduled',start_time:'2026-09-25T00:00:00Z',home:{name:'A'},away:{name:'B'}}));
const previous={events:rows};
const complete=(events)=>({connected:true,events,snapshot:{complete:true,count:events.length,date_from:'2026-09-24T14:00:00Z',date_to:'2026-09-25T13:59:59Z'}});
describe('canonical day snapshots and interrupted requests',()=>{
  it('a completed canonical snapshot retires old aliases instead of retaining them forever',()=>{
    const current=complete(rows.slice(0,10));const r=stabilizeDayPayload(previous,current);
    expect(r.protectedShrink).toBe(false);expect(r.payload.events).toHaveLength(10);
  });
  it('keeps the existing board on a failed request',()=>{
    expect(stabilizeDayPayload(previous,null).payload).toBe(previous);
  });
  it.each([{}, {snapshot:{complete:false}}, {connected:true,snapshot:{complete:true,count:500}}, {connected:false,snapshot:{complete:true,count:10}}])('retains protection for unproven/partial shrink %j',meta=>{
    const r=stabilizeDayPayload(previous,{events:rows.slice(0,10),...meta});
    expect(r.protectedShrink).toBe(true);expect(r.payload.events).toHaveLength(40);
  });
  it('explicit empty events never resurrect a legacy matches array',()=>{
    expect(rawPayloadRows({events:[],matches:rows})).toEqual([]);
  });
  it('an authoritative empty day is not permanently pinned to an old date snapshot',()=>{
    expect(stabilizeDayPayload(previous,complete([])).payload.events).toEqual([]);
  });
});
