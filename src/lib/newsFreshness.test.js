import {describe, expect, it} from "vitest";
import {
  filterEditorialToday,
  filterPortalHomeToday,
  isEditorialToday,
} from "./newsFreshness.js";

describe("Sydney editorial-day news filtering", () => {
  const now = new Date("2026-09-28T04:00:00Z"); // 14:00 Sydney Sep 28
  const today = {
    id: 1,
    published_at: "2026-09-27T15:00:00Z", // 01:00 Sydney Sep 28
  };
  const yesterday = {
    id: 2,
    published_at: "2026-09-27T13:00:00Z", // 23:00 Sydney Sep 27
  };

  it("keeps only the Sydney editorial day", () => {
    expect(isEditorialToday(today, now)).toBe(true);
    expect(isEditorialToday(yesterday, now)).toBe(false);
    expect(filterEditorialToday([yesterday, today], now)).toEqual([today]);
  });

  it("removes stale Home modules and promotes a fresh latest story when needed", () => {
    const result = filterPortalHomeToday({
      featured: [yesterday],
      latest: [today],
      breaking: [yesterday],
      most_read: [yesterday, today],
      by_sport: {football: [yesterday, today]},
      by_league: [{league: "epl", articles: [yesterday, today]}],
    }, now);
    expect(result.featured).toEqual([today]);
    expect(result.latest).toEqual([today]);
    expect(result.breaking).toEqual([]);
    expect(result.most_read).toEqual([today]);
    expect(result.by_sport.football).toEqual([today]);
    expect(result.by_league[0].articles).toEqual([today]);
  });
});
