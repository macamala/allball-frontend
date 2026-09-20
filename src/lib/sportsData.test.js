import { describe, expect, it } from "vitest";
import {
  browseCompetitions,
  displayConfidence,
  eventDateKey,
  eventLocalDateKey,
  formatEventTime,
  formatPercent,
  groupEventsByDate,
  normalizeEvent,
  outcomePercents,
  periodRange,
  predictionMarket,
  visibleEvidence,
} from "./sportsData.js";

const tue = {
  id: "evt-tue",
  sport: "football",
  competition: "UEFA Champions League",
  home: { name: "Home FC" },
  away: { name: "Away FC" },
  start_time: "2026-09-15T19:00:00Z",
  status: "scheduled",
};

const wed = {
  ...tue,
  id: "evt-wed",
  start_time: "2026-09-16T19:00:00Z",
};

describe("normalizeEvent", () => {
  it("maps legacy ScoreMatch rows and NormalizedEvent objects onto one shape", () => {
    const legacy = normalizeEvent({
      id: "m1",
      home: "Home FC",
      away: "Away FC",
      home_score: 1,
      away_score: 0,
      status: "live",
      competition: "Premier League",
      kickoff: "2026-09-15T15:00:00Z",
    });
    const nested = normalizeEvent({
      id: "m1",
      home: { name: "Home FC" },
      away: { name: "Away FC" },
      score: { home: 1, away: 0 },
      status: "live",
      competition: "Premier League",
      start_time: "2026-09-15T15:00:00Z",
    });
    expect(legacy.home.name).toBe("Home FC");
    expect(nested.away.name).toBe("Away FC");
    expect(legacy.score.home).toBe(1);
    expect(nested.score.away).toBe(0);
    expect(legacy.start_time).toBe(nested.start_time);
    expect(legacy.live).toBe(true);
  });

  it("keeps baseball inning half so Score Centre can show Top/Bot", () => {
    const event = normalizeEvent({
      id: "mlb-1",
      sport: "baseball",
      status: "live",
      home: { name: "Cardinals" },
      away: { name: "Nationals" },
      score: { home: 3, away: 3, inning: 10, inning_half: "top", outs: 0 },
    });
    expect(event.score.inning).toBe(10);
    expect(event.score.inning_half).toBe("top");
    expect(event.score.outs).toBe(0);
  });

  it("does not display participant_a when it belongs to a different pair", () => {
    const event = normalizeEvent({
      id: "ninko-evt-a2c6648428d9820b31b9",
      home: { name: "Gabriela Dabrowski / Luisa Stefani" },
      away: { name: "Kaitlin Quevedo / Dominika Salkova" },
      participant_a: { name: "Estelle Cascino / Shuo Feng" },
      participant_b: { name: "Kristina Novak / Ivana Sebestova" },
      score: { home: 2, away: 0 },
      periods: [
        { home: 6, away: 4 },
        { home: 6, away: 4 },
      ],
    });
    expect(event.home.name).toBe("Gabriela Dabrowski / Luisa Stefani");
    expect(event.away.name).toBe("Kaitlin Quevedo / Dominika Salkova");
  });
});

describe("prediction markets", () => {
  it("lets football represent home/draw/away and omits draw for basketball and tennis", () => {
    expect(predictionMarket("football")).toBe("1x2");
    expect(predictionMarket("basketball")).toBe("winner");
    expect(predictionMarket("tennis")).toBe("winner");
    expect(predictionMarket("motorsport")).toBe(null);
    expect(predictionMarket("horse-racing")).toBe(null);
    expect(predictionMarket("mma")).toBe(null);
    const football = outcomePercents(
      { home_win_pct: 52, draw_pct: 27, away_win_pct: 21, market: "1x2" },
      "football"
    );
    expect(football.map((row) => row.key)).toEqual(["home", "draw", "away"]);
    expect(formatPercent(52)).toBe("52%");
    const basketball = outcomePercents(
      { home_win_pct: 61, away_win_pct: 39, market: "winner" },
      "basketball"
    );
    expect(basketball.map((row) => row.key)).toEqual(["home", "away"]);
    const tennis = outcomePercents(
      { home_win_pct: 55, away_win_pct: 45 },
      "tennis"
    );
    expect(tennis.some((row) => row.key === "draw")).toBe(false);
  });

  it("does not invent confidence from the highest percentage", () => {
    expect(displayConfidence({ home_win_pct: 80 })).toBeNull();
    expect(displayConfidence({ confidence: "medium" })).toBe("medium");
  });
});

describe("evidence and grouping", () => {
  it("omits missing evidence and groups This Week fixtures by actual dates", () => {
    expect(visibleEvidence({ evidence: [{ type: "recent_form", facts: { wins: 4 } }] })).toHaveLength(1);
    expect(visibleEvidence({ evidence: [{ type: "injuries" }] })).toHaveLength(0);
    expect(visibleEvidence({})).toEqual([]);
    const groups = groupEventsByDate([wed, tue]);
    expect(groups.map((group) => group.date)).toEqual(["2026-09-15", "2026-09-16"]);
    expect(groups[0].label).toBeTruthy();
    expect(groups[1].label).toBeTruthy();
    expect(groups[0].date).not.toBe(groups[1].date);
    expect(eventDateKey(tue)).toBe("2026-09-15");
  });

  it("computes period ranges from the supplied now, including This Week Monday–Sunday", () => {
    const wednesday = new Date("2026-09-16T10:00:00");
    const week = periodRange("this-week", wednesday);
    expect(week.from.getDay()).toBe(1);
    expect(week.to.getDay()).toBe(0);
    const today = periodRange("today", wednesday);
    expect(today.from.getDate()).toBe(16);
    const next7 = periodRange("next-7", wednesday);
    expect(next7.to.getDate()).toBe(22);
  });
});

describe("browse competitions", () => {
  it("uses provider competitions when present and editorial IA otherwise", () => {
    const sport = {
      leagues: [
        { path: "champions-league", league: "uefa-champions-league", label: "UEFA Champions League" },
        { path: "other-leagues", league: null, catchAll: true },
      ],
    };
    const editorial = browseCompetitions(sport, []);
    expect(editorial).toHaveLength(1);
    expect(editorial[0].path).toBe("champions-league");
    const fromProvider = browseCompetitions(sport, [{ slug: "nba", label: "NBA", key: "nba" }]);
    expect(fromProvider[0].league).toBe("nba");
  });
});

describe("scores helpers", () => {
  it("maps families onto canonical event types without inventing scores", () => {
    const tennis = normalizeEvent({
      id: "t1",
      sport: "tennis",
      event_family: "individual_match",
      home: { name: "A" },
      away: { name: "B" },
      status: "live",
      start_time: "2026-09-19T03:00:00Z",
      field_sources: { home: "sportscore:hidden" },
    });
    expect(tennis.event_type).toBe("HEAD_TO_HEAD");
    expect(tennis.provider).toBeNull();
    expect(tennis.live).toBe(true);
    const race = normalizeEvent({
      id: "r1",
      event_family: "motorsport_race",
      home: { name: "Monaco GP" },
      status: "scheduled",
    });
    expect(race.event_type).toBe("RACE");
    const meet = normalizeEvent({
      id: "m1",
      sport: "athletics",
      event_family: "individual",
      home: { name: "Diamond League" },
      status: "scheduled",
    });
    expect(meet.event_type).toBe("MEET");
  });

  it("keeps DATE_ONLY events on the source calendar date", () => {
    const event = {
      start_time: "2026-09-19T00:00:00Z",
      start_precision: "DATE_ONLY",
      start_date: "2026-09-19",
    };
    expect(eventLocalDateKey(event)).toBe("2026-09-19");
  });

  it("does not render date-only or unknown precision as 00:00", () => {
    expect(formatEventTime({ start_time: "2026-09-20T00:00:00Z", start_precision: "DATE_ONLY" })).toBe("");
    expect(formatEventTime({ start_time: "2026-09-20T00:00:00Z", start_precision: "UNKNOWN" })).toBe("");
    expect(formatEventTime({ start_time: "2026-09-20T00:00:00Z", start_precision: "EXACT_TIME" })).not.toBe("");
    expect(formatEventTime({ start_time: "2026-09-20T00:00:00Z" })).toBe("");
  });
});
