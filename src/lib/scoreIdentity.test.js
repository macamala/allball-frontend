import { describe, expect, it } from "vitest";
import { collapseDisplayEvents, namesEquivalent } from "./scoreIdentity.js";

describe("score identity", () => {
  it("equates official and short club names", () => {
    expect(namesEquivalent("São Paulo", "Sao Paulo - SP")).toBe(true);
    expect(namesEquivalent("Internacional", "Internacional -")).toBe(true);
    expect(namesEquivalent("Lens", "Racing Club de Lens")).toBe(true);
    expect(namesEquivalent("Espanyol", "RCD Espanyol de Barcelona")).toBe(true);
    expect(namesEquivalent("Inter", "Inter Miami")).toBe(false);
    expect(namesEquivalent("Real Madrid", "Real Sociedad")).toBe(false);
  });

  it("collapses one fixture and keeps finished scores", () => {
    const rows = collapseDisplayEvents([
      {
        id: "a",
        sport: "football",
        competition_key: "ligue-1",
        start_time: "2026-09-20T18:00:00Z",
        home: { name: "Monaco" },
        away: { name: "Lens" },
        status: "finished",
        score: { home: 2, away: 1 },
      },
      {
        id: "b",
        sport: "football",
        competition_key: "ligue-1",
        start_time: "2026-09-20T18:00:00Z",
        home: { name: "AS Monaco FC" },
        away: { name: "Racing Club de Lens" },
        status: "scheduled",
        score: { home: null, away: null },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].score.home).toBe(2);
    expect(rows[0].status).toBe("finished");
  });

  it("does not merge different dates or competitions", () => {
    const rows = collapseDisplayEvents([
      {
        id: "a",
        sport: "football",
        competition_key: "serie-a",
        start_time: "2026-09-20T18:00:00Z",
        home: { name: "Roma" },
        away: { name: "Lazio" },
        status: "scheduled",
        score: { home: null, away: null },
      },
      {
        id: "b",
        sport: "football",
        competition_key: "coppa",
        start_time: "2026-09-20T18:00:00Z",
        home: { name: "Roma" },
        away: { name: "Lazio" },
        status: "scheduled",
        score: { home: null, away: null },
      },
      {
        id: "c",
        sport: "football",
        competition_key: "serie-a",
        start_time: "2026-09-21T18:00:00Z",
        home: { name: "Roma" },
        away: { name: "Lazio" },
        status: "scheduled",
        score: { home: null, away: null },
      },
    ]);
    expect(rows).toHaveLength(3);
  });

  it("preserves 0-0 and null scores", () => {
    const zero = collapseDisplayEvents([
      {
        id: "z",
        sport: "football",
        competition_key: "pl",
        start_time: "2026-09-20T15:00:00Z",
        home: { name: "Arsenal" },
        away: { name: "Chelsea" },
        status: "finished",
        score: { home: 0, away: 0 },
      },
    ]);
    expect(zero[0].score.home).toBe(0);
    const empty = collapseDisplayEvents([
      {
        id: "n",
        sport: "football",
        competition_key: "pl",
        start_time: "2026-09-20T15:00:00Z",
        home: { name: "Arsenal" },
        away: { name: "Chelsea" },
        status: "scheduled",
        score: { home: null, away: null },
      },
    ]);
    expect(empty[0].score.home).toBeNull();
  });
});
