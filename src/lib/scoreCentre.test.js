import { describe, expect, it } from "vitest";
import { FALLBACK_SPORTS } from "../config/sportsRegistry.js";
import { sanitizeParticipantName } from "./participantDisplay.js";
import { coverageForSport, formatPairScore, rendererForEvent, statusLabel } from "./scorePresentation.js";
import {
  dateKeyInTimeZone,
  eventLocalDateKey,
  isoDate,
  localDayUtcBounds,
  matchesStatusView,
  normalizeEvent,
  statusCounts,
} from "./sportsData.js";

describe("placeholder sanitization", () => {
  it("humanizes known bracket codes and never invents a player", () => {
    expect(sanitizeParticipantName("Wsf1")).toBe("Winner of SF1");
    expect(sanitizeParticipantName("Wqf2")).toBe("Winner of QF2");
    expect(sanitizeParticipantName("Lsf1")).toBe("Loser of SF1");
    expect(sanitizeParticipantName("TBD")).toBe("TBD");
    expect(sanitizeParticipantName("tba")).toBe("TBD");
    expect(sanitizeParticipantName("Team TBD")).toBe("TBD");
    expect(sanitizeParticipantName("Ilia Simakin")).toBe("Ilia Simakin");
    expect(sanitizeParticipantName("19.09.2026")).toBe("");
    expect(sanitizeParticipantName("2026-09-19")).toBe("");
  });
});

describe("score formatting", () => {
  it("never turns a missing score into 0-0", () => {
    expect(formatPairScore(null, null)).toBe("–");
    expect(formatPairScore(undefined, undefined)).toBe("–");
    expect(formatPairScore(1, null)).toBe("1 – –");
    expect(formatPairScore(0, 0)).toBe("0 – 0");
    const blank = normalizeEvent({
      id: "n1",
      sport: "football",
      event_family: "team_match",
      home: { name: "A" },
      away: { name: "B" },
      status: "scheduled",
      score: { home: null, away: null },
    });
    expect(blank.score.home).toBeNull();
    expect(blank.score.away).toBeNull();
  });

  it("keeps a real 0-0 distinct from a missing score", () => {
    expect(formatPairScore(0, 0)).toBe("0 – 0");
    const zeros = normalizeEvent({
      id: "n2",
      sport: "football",
      event_family: "team_match",
      home: { name: "A" },
      away: { name: "B" },
      status: "finished",
      score: { home: 0, away: 0 },
    });
    expect(zeros.score.home).toBe(0);
    expect(zeros.score.away).toBe(0);
  });
});

describe("daily scoreboard date and status", () => {
  it("treats Australia/Sydney calendar dates differently from UTC ISO keys", () => {
    const iso = "2026-09-18T15:00:00Z";
    expect(new Date(iso).toISOString().slice(0, 10)).toBe("2026-09-18");
    expect(dateKeyInTimeZone(iso, "UTC")).toBe("2026-09-18");
    expect(dateKeyInTimeZone(iso, "Australia/Sydney")).toBe("2026-09-19");
    const bounds = localDayUtcBounds("2026-09-19");
    const from = new Date(bounds.date_from);
    const to = new Date(bounds.date_to);
    expect(Number.isNaN(from.getTime())).toBe(false);
    expect(to.getTime() - from.getTime()).toBeGreaterThan(20 * 60 * 60 * 1000);
  });

  it("counts finished, live and upcoming events on the same local date", () => {
    const rows = [
      normalizeEvent({
        id: "fin",
        sport: "football",
        status: "finished",
        live: false,
        start_time: "2026-09-19T04:00:00Z",
        home: { name: "A" },
        away: { name: "B" },
        score: { home: 1, away: 0 },
      }),
      normalizeEvent({
        id: "live",
        sport: "tennis",
        status: "live",
        live: true,
        start_time: "2026-09-19T05:00:00Z",
        home: { name: "C" },
        away: { name: "D" },
        score: { home: 0, away: 0 },
      }),
      normalizeEvent({
        id: "up",
        sport: "basketball",
        status: "scheduled",
        live: false,
        start_time: "2026-09-19T12:00:00Z",
        home: { name: "E" },
        away: { name: "F" },
        score: { home: null, away: null },
      }),
    ];
    expect(statusCounts(rows)).toEqual({ all: 3, live: 1, upcoming: 1, finished: 1 });
    expect(rows.filter((row) => matchesStatusView(row, "all")).map((row) => row.id)).toEqual([
      "fin",
      "live",
      "up",
    ]);
    expect(rows.filter((row) => matchesStatusView(row, "finished")).map((row) => row.id)).toEqual(["fin"]);
    expect(isoDate(new Date("2026-09-19T12:00:00"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(eventLocalDateKey(rows[1])).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("all-sport renderer coverage", () => {
  it("maps every enabled registry sport onto a known renderer family", () => {
    const unknown = [];
    for (const sport of FALLBACK_SPORTS.filter((row) => row.active !== false)) {
      const row = coverageForSport(sport.slug);
      if (row.unknown) unknown.push(sport.slug);
    }
    expect(unknown).toEqual([]);
  });

  it("covers 41 registered sports with status formatter semantics", () => {
    expect(FALLBACK_SPORTS.filter((row) => row.active !== false).length).toBe(41);
    const t = (key) =>
      ({
        "live.live": "LIVE",
        "live.ft": "FT",
        "live.final": "Final",
        "live.ht": "HT",
        "live.break": "Break",
        "live.raceFinished": "Finished",
      }[key] || key);
    for (const sport of FALLBACK_SPORTS.filter((row) => row.active !== false)) {
      const scheduled = {
        sport: sport.slug,
        event_family: sport.event_model,
        status: "scheduled",
        start_precision: "EXACT_TIME",
        start_time: "2026-09-19T19:00:00Z",
        score: { home: null, away: null },
      };
      const live = {
        ...scheduled,
        status: "live",
      };
      const finished = {
        ...scheduled,
        status: "finished",
        score: sport.event_model === "racing" || sport.event_model === "tournament" ? { home: null, away: null } : { home: 1, away: 0 },
      };
      expect(statusLabel(scheduled, t, "21:00")).toBe("21:00");
      expect(statusLabel(live, t, "21:00")).toBe("LIVE");
      expect(statusLabel(finished, t, "21:00")).toMatch(/FT|Final|Finished/);
    }
  });

  it("never infers LIVE from a live flag on a scheduled event", () => {
    const t = (key) => (key === "live.live" ? "LIVE" : key);
    expect(
      statusLabel(
        { status: "scheduled", live: true, start_time: "2026-09-19T11:00:00Z", sport: "football" },
        t,
        "21:00"
      )
    ).toBe("21:00");
  });

  it("uses supplied sport state and never fabricates a minute", () => {
    const t = (key) => ({ "live.live": "LIVE", "live.ht": "HT" }[key] || key);
    expect(statusLabel({ sport: "football", status: "live", score: { minute: 34 } }, t, "21:00")).toBe("34’");
    expect(statusLabel({ sport: "football", status: "break" }, t, "21:00")).toBe("HT");
    expect(statusLabel({ sport: "basketball", status: "live", score: { period: 2, clock: "04:31" } }, t, "19:30")).toBe(
      "Q2 04:31"
    );
    expect(statusLabel({ sport: "ice-hockey", status: "live", score: { period: 2, clock: "08:13" } }, t, "19:00")).toBe(
      "P2 08:13"
    );
    expect(
      statusLabel({ sport: "baseball", status: "live", score: { inning: 5, inning_half: "top" } }, t, "18:10")
    ).toBe("Top 5");
    expect(statusLabel({ sport: "football", status: "live", score: {} }, t, "21:00")).toBe("LIVE");
  });

  it("selects the correct renderer for observed production families", () => {
    expect(rendererForEvent({ sport: "football", event_family: "team_match" })).toBe("TEAM_MATCH");
    expect(rendererForEvent({ sport: "tennis", event_family: "individual_match" })).toBe("HEAD_TO_HEAD");
    expect(rendererForEvent({ sport: "mma", event_family: "combat" })).toBe("HEAD_TO_HEAD");
    expect(rendererForEvent({ sport: "motorsport", event_family: "motorsport_race" })).toBe("RACE");
    expect(rendererForEvent({ sport: "horse-racing", event_family: "racing" })).toBe("RACE");
    expect(rendererForEvent({ sport: "cycling", event_family: "stage_race" })).toBe("RACE");
    expect(rendererForEvent({ sport: "golf", event_family: "tournament" })).toBe("TOURNAMENT");
    expect(rendererForEvent({ sport: "athletics", event_family: "individual" })).toBe("MEET");
    expect(rendererForEvent({ sport: "swimming", event_family: "tournament" })).toBe("MEET");
    expect(rendererForEvent({ sport: "dota-2", event_family: "esports_match" })).toBe("TEAM_MATCH");
    expect(rendererForEvent({ sport: "dota-2", event_family: "esports_match", bracket: true })).toBe("BRACKET");
    expect(rendererForEvent({ sport: "mystery-sport", event_family: "totally-new" })).toBe("UNKNOWN");
  });
});
