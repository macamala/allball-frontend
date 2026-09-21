import { describe, expect, it } from "vitest";
import { collapseDisplayEvents, namesEquivalent } from "./scoreIdentity.js";

describe("score identity", () => {
  it("does not merge youth, women, or same names in different clubs", () => {
    expect(namesEquivalent("Chelsea", "Chelsea U21")).toBe(false);
    expect(namesEquivalent("Arsenal", "Arsenal Women")).toBe(false);
    expect(namesEquivalent("Manchester United", "West Ham United")).toBe(false);
  });

  it("equates official and short club names", () => {
    expect(namesEquivalent("São Paulo", "Sao Paulo - SP")).toBe(true);
    expect(namesEquivalent("Internacional", "Internacional -")).toBe(true);
    expect(namesEquivalent("Lens", "Racing Club de Lens")).toBe(true);
    expect(namesEquivalent("Espanyol", "RCD Espanyol de Barcelona")).toBe(true);
    expect(namesEquivalent("Inter", "FC Internazionale Milano")).toBe(true);
    expect(namesEquivalent("Fiorentina", "ACF Fiorentina")).toBe(true);
    expect(namesEquivalent("Roma", "AS Roma")).toBe(true);
    expect(namesEquivalent("Inter", "Inter Miami")).toBe(false);
    expect(namesEquivalent("Real Madrid", "Real Sociedad")).toBe(false);
    expect(namesEquivalent("Lokomotiv Tashkent", "Lok. Tashkent")).toBe(true);
    expect(namesEquivalent("Neftchi Fergana", "Neftchi Fargona")).toBe(true);
    expect(namesEquivalent("Bologna", "Bologna FC")).toBe(true);
    expect(namesEquivalent("Torino", "Torino FC")).toBe(true);
    expect(namesEquivalent("Arsenal", "Arsenal U21")).toBe(false);
  });

  it("collapses Roma/Inter and Fiorentina/Napoli aliases without merging cup ties", () => {
    const rows = collapseDisplayEvents([
      {
        id: "ri-a",
        sport: "football",
        competition_key: "serie-a",
        start_time: "2026-09-20T18:45:00Z",
        home: { name: "Roma" },
        away: { name: "Inter" },
        status: "finished",
        score: { home: 2, away: 2 },
      },
      {
        id: "ri-b",
        sport: "football",
        competition_key: "serie-a",
        start_time: "2026-09-20T19:00:00Z",
        home: { name: "AS Roma" },
        away: { name: "FC Internazionale Milano" },
        status: "scheduled",
        score: { home: null, away: null },
      },
      {
        id: "fn-a",
        sport: "football",
        competition_key: "serie-a",
        start_time: "2026-09-20T18:45:00Z",
        home: { name: "Fiorentina" },
        away: { name: "Napoli" },
        status: "halftime",
        score: { home: 0, away: 1 },
      },
      {
        id: "fn-b",
        sport: "football",
        competition_key: "serie-a",
        start_time: "2026-09-20T19:05:00Z",
        home: { name: "ACF Fiorentina" },
        away: { name: "SSC Napoli" },
        status: "scheduled",
        score: { home: null, away: null },
      },
      {
        id: "ri-cup",
        sport: "football",
        competition_key: "coppa",
        start_time: "2026-09-20T18:45:00Z",
        home: { name: "Roma" },
        away: { name: "Inter" },
        status: "scheduled",
        score: { home: null, away: null },
      },
    ]);
    expect(rows).toHaveLength(3);
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
