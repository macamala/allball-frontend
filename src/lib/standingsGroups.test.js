import { describe, it, expect } from "vitest";
import { standingsGroups, preferredStandingsGroup, matchSectionFromHash } from "./standingsGroups.js";
import { normalizeEvent, groupEventsByCompetition } from "./sportsData.js";

describe("football group identity", () => {
  const event = { id:"serbia", sport:"football", competition:"UEFA Nations League", competition_key:"uefa-nations-league",
    group:"UEFA Nations League A Grp. 2", stage:"UEFA Nations League A", home:{name:"Serbia",id:"1"}, away:{name:"Greece",id:"2"} };
  const rows = [
    {team:"Serbia",team_id:"1",stage:"UEFA Nations League A",group:event.group,points:0},
    {team:"Greece",team_id:"2",stage:"UEFA Nations League A",group:event.group,points:3},
    {team:"Austria",team_id:"3",stage:"UEFA Nations League B",group:"UEFA Nations League B Grp. 3",points:3},
    {team:"Israel",team_id:"4",stage:"UEFA Nations League B",group:"UEFA Nations League B Grp. 3",points:0},
  ];
  it("does not mix divisions or event groups", () => {
    const groups = standingsGroups(rows);
    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.key === preferredStandingsGroup(groups,event)).rows.map(r=>r.team)).toEqual(["Serbia","Greece"]);
    expect(groupEventsByCompetition([normalizeEvent(event),normalizeEvent({...event,id:"other",group:rows[2].group})])).toHaveLength(2);
  });
  it("resolves the group from both teams when old event metadata is absent", () => {
    const groups = standingsGroups(rows);
    expect(preferredStandingsGroup(groups,{...event,group:null})).toBe(groups[0].key);
    expect(preferredStandingsGroup(groups,{home:{name:"Serbia"},away:{name:"Israel"}})).toBe("");
  });
  it("opens table links and preserves the section requested before table loading", () => {
    expect(matchSectionFromHash("#mc-standings")).toBe("standings");
    expect(matchSectionFromHash("#mc-panel-standings")).toBe("standings");
    expect(matchSectionFromHash("#untrusted")).toBe("overview");
  });
});
