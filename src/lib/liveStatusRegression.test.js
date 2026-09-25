import { describe, expect, it } from "vitest";
import { isConfirmedLive, normalizeEvent, mergeEventPayload, statusCounts } from "./sportsData.js";
import { statusLabel } from "./scorePresentation.js";

const live = {id:"cayman",sport:"football",home:{name:"Cayman Islands"},away:{name:"Dominica"},start_time:"2026-09-25T00:10:00Z",status:"live",live:true,live_class:"CONFIRMED_LIVE",score:{home:0,away:0,minute:"95’"},updated_at:"2026-09-25T02:12:00Z"};
const t = (key) => key === "live.ft" ? "FT" : key;

describe("reported frozen 92–99 minute rows", () => {
  it.each(["finished","ft","cancelled","abandoned","postponed","scheduled","stale"])("%s always beats a retained CONFIRMED_LIVE flag", (status) => {
    const event = normalizeEvent({...live,status});
    expect(isConfirmedLive(event)).toBe(false);
    expect(event.live).toBe(false);
  });
  it.each(["UNPROVEN_LIVE","STATUS_CONFLICT","STALE_LIVE"])("rejects %s even when a raw source says live", (live_class) => {
    expect(isConfirmedLive({...live,live_class})).toBe(false);
  });
  it("an explicit false live flag cannot be overruled", () => {
    expect(isConfirmedLive({...live,live:false})).toBe(false);
  });
  it("FT delta clears the old live flag, keeps the real score and leaves the LIVE count", () => {
    const payload=mergeEventPayload({events:[live]}, [{id:live.id,status:"finished",score:{home:0,away:0},updated_at:"2026-09-25T04:12:51Z"}]);
    const event=normalizeEvent(payload.events[0]);
    expect(event.status).toBe("finished");
    expect(event.live_class).not.toBe("CONFIRMED_LIVE");
    expect(statusCounts([event])).toEqual({all:1,live:0,upcoming:0,finished:1});
    expect(statusLabel(event,t,"10:10")).not.toContain("95");
    expect(event.home.name).toBe("Cayman Islands");
  });
  it("an older overlapping live request cannot overwrite a newer final", () => {
    const final={...live,status:"finished",live:false,updated_at:"2026-09-25T04:12:51Z"};
    const next=mergeEventPayload({events:[final]},[live]).events[0];
    expect(next.status).toBe("finished");expect(isConfirmedLive(next)).toBe(false);
  });
  it("a status-only hidden Andorra alias is not rediscovered as a new match", () => {
    const current={...live,id:"andorra-canonical",status:"finished",live:false,score:{home:1,away:2}};
    const next=mergeEventPayload({events:[current]},[{id:"andorra-old",status:"scheduled",score:{home:null,away:null}}]);
    expect(next.events.map(x=>x.id)).toEqual(["andorra-canonical"]);
  });
  it("explicit retirement removes only the retired ID, not same-name matches", () => {
    const next=mergeEventPayload({events:[live,{...live,id:"different-match"}]},[{id:live.id,removed:true,updated_at:"2026-09-25T04:20:00Z"}]);
    expect(next.events.map(x=>x.id)).toEqual(["different-match"]);
  });
  it("a full newly discovered row is still retained", () => {
    expect(mergeEventPayload({events:[]},[live]).events).toEqual([live]);
  });
});
