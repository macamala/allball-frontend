import { describe, expect, it } from "vitest";
import { publishedNewsRows, publishedNewsArchiveRows, preparePortalHomeNews } from "./newsFreshness.js";

const now = new Date("2026-09-29T02:10:00Z");
const today = Object.freeze({ id: 1, published_at: "2026-09-28T14:00:00" });
const yesterday = Object.freeze({ id: 2, published_at: "2026-09-28T13:59:59" });
const older = Object.freeze({ id: 3, published_at: "2026-09-01T03:00:00Z" });

describe("published News retention", () => {
  it("keeps approved old originals while excluding legacy copies and held or imageless records", () => {
    const approved = { ...older, ai_generated: true, quality_ok: true,
      sport_match_ok: true, image_url: "https://example.test/photo.jpg", hero_media_kind: "EDITORIAL_PHOTO" };
    expect(publishedNewsArchiveRows([approved,
      { ...approved, id: 4, ai_generated: false },
      { ...approved, id: 5, ai_generated: undefined },
      { ...approved, id: 6, quality_ok: false },
      { ...approved, id: 7, sport_match_ok: false },
      { ...approved, id: 8, image_url: null },
      { ...approved, id: 9, hero_media_kind: "GRAPHIC" },
    ], now)).toEqual([approved]);
  });
  it("retains yesterday and older articles with original timestamps, newest first", () => {
    const input = Object.freeze([older, today, yesterday]);
    expect(publishedNewsRows(input, now)).toEqual([today, yesterday, older]);
    expect(input).toEqual([older, today, yesterday]);
  });
  it("does not expire existing articles when the Sydney day changes", () => {
    const input = [today, yesterday, older];
    expect(publishedNewsRows(input, new Date("2026-10-01T00:00:00Z"))).toEqual(input);
  });
  it("rejects missing, invalid and future publication times", () => {
    expect(publishedNewsRows([null, {}, { published_at: "invalid" },
      { published_at: "2026-09-30T00:00:00Z" }, yesterday], now)).toEqual([yesterday]);
  });
  it("keeps old News in home sections without labeling it breaking today", () => {
    const payload = { featured: [yesterday], latest: [older, today, yesterday],
      breaking: [yesterday, today], most_read: [yesterday],
      by_sport: { football: [yesterday, today], cycling: [older] },
      by_league: [{ league: "test", articles: [yesterday] }] };
    const result = preparePortalHomeNews(payload, now);
    expect(result.featured).toEqual([today]);
    expect(result.latest).toEqual([today, yesterday, older]);
    expect(result.breaking).toEqual([today]);
    expect(result.most_read).toEqual([yesterday]);
    expect(result.by_sport.football).toEqual([today, yesterday]);
    expect(result.by_sport.cycling).toEqual([older]);
    expect(result.by_league[0].articles).toEqual([yesterday]);
  });
  it("does not blank a sport or home merely because today has no new article", () => {
    expect(preparePortalHomeNews({ featured: [yesterday] }, now).featured).toEqual([yesterday]);
    expect(publishedNewsRows([older], now)).toEqual([older]);
  });
});
