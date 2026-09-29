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

// Run this suite with TZ=Australia/Sydney as well as UTC to catch the original
// browser-local parsing bug. API timestamps have no timezone suffix.
describe("UTC timestamps from the News API", () => {
  const now = new Date("2026-09-29T00:17:45Z");
  it("keeps a current Sydney story when its source date is still yesterday in UTC", () => {
    const story = {id: 31, published_at: "2026-09-28T23:58:37"};
    expect(isEditorialToday(story, now)).toBe(true);
    expect(filterPortalHomeToday({featured: [], latest: [story]}, now).featured).toEqual([story]);
  });
  it("uses the Sydney midnight boundary and preserves explicit offsets", () => {
    expect(isEditorialToday({published_at: "2026-09-28T13:59:59.999999"}, now)).toBe(false);
    expect(isEditorialToday({published_at: "2026-09-28T14:00:00"}, now)).toBe(true);
    expect(isEditorialToday({published_at: "2026-09-29T00:00:00+10:00"}, now)).toBe(true);
    expect(isEditorialToday({published_at: "2026-09-28T23:59:59+10:00"}, now)).toBe(false);
  });
  it("handles Sydney daylight saving and rejects invalid dates", () => {
    const summer = new Date("2026-10-05T00:00:00Z");
    expect(isEditorialToday({published_at: "2026-10-04T13:00:00"}, summer)).toBe(true);
    expect(isEditorialToday({published_at: "2026-10-04T12:59:59"}, summer)).toBe(false);
    expect(isEditorialToday({published_at: "invalid", created_at: "2026-09-29T00:00:00Z"}, now)).toBe(false);
    expect(isEditorialToday({created_at: "2026-09-28T21:00:00.123456"}, now)).toBe(true);
  });
});
