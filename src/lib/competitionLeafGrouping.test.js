import { describe, it, expect } from "vitest";
import { groupEventsByCompetition } from "./sportsData.js";
const name = "FIFA ASEAN Cup Premier Division Grp. A";
const leaf = { sport: "football", competition_key: "football-fifa-asean-cup-premier-division-grp-a", competition_name: name, competition: name, status: "scheduled", start_time: "2026-09-25T09:00:00Z" };
describe("canonical competition leaf presentation", () => {
  it.each([false, true])("mixed enriched and plain rows form one group, reverse=%s", reverse => {
    const events = [{...leaf, id:"plain"}, {...leaf,id:"rich",group:name}];
    const before = JSON.stringify(events);
    const groups = groupEventsByCompetition(reverse ? [...events].reverse() : events);
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map(e=>e.id)).toEqual(["plain","rich"]);
    expect(groups[0].group).toBe(name);
    expect(groups[0].standings_group).toBe("");
    expect(JSON.stringify(events)).toBe(before);
  });
  it("does not assign an unknown parent-league match to the only known group", () => {
    const parent={...leaf,competition_key:"uefa-nations-league",competition_name:"UEFA Nations League"};
    const groups=groupEventsByCompetition([{...parent,id:"unknown"},{...parent,id:"a",group:"UEFA Nations League A Grp. 2"}]);
    expect(groups).toHaveLength(2);
    expect(groups.find(g=>g.events[0].id==="unknown").group).toBeNull();
    expect(groups.find(g=>g.events[0].id==="a").standings_group).toBe("UEFA Nations League A Grp. 2");
  });
  it("retains distinct explicit groups and distinct competition IDs", () => {
    const groups=groupEventsByCompetition([{...leaf,id:"a",group:name},{...leaf,id:"b",group:"FIFA ASEAN Cup Premier Division Grp. B"},{...leaf,id:"other",competition_key:"unrelated"}]);
    expect(groups).toHaveLength(3);
  });
  it("does not transfer a football group to another sport with the same key", () => {
    const groups=groupEventsByCompetition([{...leaf,id:"a",group:name},{...leaf,id:"b",sport:"basketball"}]);
    expect(groups).toHaveLength(2);
    expect(groups.find(g=>g.sport==="basketball").group).toBeNull();
  });
  it("matches full labels apart from case and whitespace, not partial names",()=>{
    const groups=groupEventsByCompetition([{...leaf,id:"a",group:name},{...leaf,id:"b",competition_name:"  FIFA ASEAN Cup  Premier Division Grp. A  "},{...leaf,id:"c",competition_name:"FIFA ASEAN Cup"}]);
    expect(groups).toHaveLength(2);
    expect(groups.find(g=>g.group).events.map(e=>e.id)).toEqual(["a","b"]);
  });
});
