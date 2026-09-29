import { describe, expect, it, vi } from "vitest";
import { allRegistrySports } from "../config/sportsRegistry.js";
import { loadTeamNews, matchesTeamNews, selectTeamNews, teamNewsIdentity } from "./teamNews.js";

const profile = (sport, name, extra = {}) => ({ available: true, entity_key: "verified-1", sport, name, team: { name }, ...extra });
const article = (title, extra = {}) => ({ id: 1, slug: "original", title, summary: "", sport: "football", image_url: "https://example.test/photo.jpg",
  ai_generated: true, quality_ok: true, sport_match_ok: true, hero_media_kind: "EDITORIAL_PHOTO", published_at: "2026-09-28T02:00:00Z", ...extra });

describe("profile-driven News linking", () => {
  it("supports an unseen team in every registered sport without a team whitelist", () => {
    const sports = allRegistrySports();
    expect(sports).toHaveLength(41);
    for (const { slug } of sports) {
      const identity = teamNewsIdentity(profile(slug, "Northbridge Falcons"));
      expect(matchesTeamNews(article("Northbridge Falcons appoint a new coach", { sport: slug }), identity), slug).toBe(true);
      expect(matchesTeamNews(article("Northbridge Falcons appoint a new coach", { sport: slug === "football" ? "basketball" : "football" }), identity), slug).toBe(false);
    }
  });
  it("uses full word-boundary names, preserves the club identity, and does not guess nicknames", () => {
    const identity = teamNewsIdentity(profile("football", "FK Crvena Zvezda", { football_gender: "men" }));
    expect(matchesTeamNews(article("Crvena Zvezda announces a signing"), identity)).toBe(true);
    expect(matchesTeamNews(article("Zvezda announces a signing"), identity)).toBe(false);
    expect(matchesTeamNews(article("Crvena Zvezdar appoints coach"), identity)).toBe(false);
    expect(matchesTeamNews(article("Crvena Zvezda signs a guard", { sport: "basketball" }), identity)).toBe(false);
    expect(teamNewsIdentity(profile("football", "United"))).toBeNull();
    expect(teamNewsIdentity(profile("football", "Inter"))).toBeNull();
    expect(matchesTeamNews(article("Manchester City signs a player"), teamNewsIdentity(profile("football", "Manchester United")))).toBe(false);
  });
  it("does not mix men's, women's, youth or reserve stories", () => {
    const men = teamNewsIdentity(profile("football", "Arsenal", { football_gender: "men" }));
    const women = teamNewsIdentity(profile("football", "Arsenal (W)", { football_gender: "women" }));
    const youth = teamNewsIdentity(profile("football", "Arsenal U21", { football_gender: "men" }));
    expect(matchesTeamNews(article("Arsenal Women sign a defender"), men)).toBe(false);
    expect(matchesTeamNews(article("Arsenal Women sign a defender"), women)).toBe(true);
    expect(matchesTeamNews(article("Arsenal sign a defender"), women)).toBe(false);
    expect(matchesTeamNews(article("Arsenal under-21 coach appointed"), youth)).toBe(true);
    expect(matchesTeamNews(article("Arsenal U19 appoint coach"), youth)).toBe(false);
    expect(matchesTeamNews(article("Arsenal U21 appoint coach"), men)).toBe(false);
    expect(matchesTeamNews(article("Arsenal II appoint coach"), men)).toBe(false);
    expect(matchesTeamNews(article("Arsenal academy appoint coach"), men)).toBe(false);
  });
  it("matches script and dotted club spellings without broadening the team name", () => {
    const zvezda = teamNewsIdentity(profile("football", "ФК Црвена Звезда", { football_gender: "men" }));
    expect(matchesTeamNews(article("Crvena Zvezda appoints a coach"), zvezda)).toBe(true);
    expect(matchesTeamNews(article("Црвена Звезда appoints a coach"), zvezda)).toBe(true);
    expect(matchesTeamNews(article("Crvena Zvezdar appoints a coach"), zvezda)).toBe(false);
    const basel = teamNewsIdentity(profile("football", "F.C. Basel U-21", { football_gender: "men" }));
    expect(matchesTeamNews(article("Basel under-21 appoints coach"), basel)).toBe(true);
    expect(matchesTeamNews(article("Basel appoints coach"), basel)).toBe(false);
  });
  it("recognizes translated country names only with national-team evidence and the same sport", () => {
    const serbia = teamNewsIdentity(profile("volleyball", "Србија"));
    expect(matchesTeamNews(article("Serbia national team announces squad", { sport: "volleyball" }), serbia)).toBe(true);
    expect(matchesTeamNews(article("Serbia national team announces squad"), serbia)).toBe(false);
    expect(matchesTeamNews(article("Club signs Serbia international", { sport: "volleyball" }), serbia)).toBe(false);
    const germany = teamNewsIdentity(profile("basketball", "Deutschland"));
    expect(matchesTeamNews(article("Germany squad announced", { sport: "basketball" }), germany)).toBe(true);
    expect(matchesTeamNews(article("Conference in Germany", { sport: "basketball" }), germany)).toBe(false);
  });
  it("preserves the original accented name when querying the archive", async () => {
    const identity = teamNewsIdentity(profile("football", "Atlético Madrid"));
    const row = article("Atlético Madrid appoints coach", { published_at: "2025-12-29T01:00:00Z" });
    const api = { searchArticles: vi.fn(async (q) => q === "Atlético Madrid" ? [row] : []), getArticles: vi.fn().mockResolvedValue([]) };
    expect((await loadTeamNews(identity, api)).rows).toEqual([row]);
    expect(api.searchArticles.mock.calls[0][0]).toBe("Atlético Madrid");
    expect(matchesTeamNews(article("Atletico Madrid appoints coach"), identity)).toBe(true);
  });
  it("requires national-team evidence, not a country location or player nationality", () => {
    for (const sport of ["football", "basketball", "volleyball", "cricket", "ice-hockey", "water-polo", "rugby"]) {
      const identity = teamNewsIdentity(profile(sport, "Serbia"));
      expect(matchesTeamNews(article("Serbia national team announces squad", { sport }), identity)).toBe(true);
      expect(matchesTeamNews(article("Serbia announce their final 14-player squad", { sport }), identity)).toBe(true);
      expect(matchesTeamNews(article("Club in Serbia announces a squad", { sport }), identity)).toBe(false);
      expect(matchesTeamNews(article("Serbia international named in club squad", { sport }), identity)).toBe(false);
      expect(matchesTeamNews(article("Club signs Serbia international", { sport }), identity)).toBe(false);
      expect(matchesTeamNews(article("League conference held in Serbia", { sport }), identity)).toBe(false);
    }
    const australia = teamNewsIdentity(profile("tennis", "Australia"));
    expect(matchesTeamNews(article("New tennis tournament in Australia", { sport: "tennis" }), australia)).toBe(false);
  });
  it("keeps archives, matches summary evidence and deduplicates without admitting held imports", () => {
    const identity = teamNewsIdentity(profile("football", "Napoli", { football_gender: "men" }));
    const old = article("Defender renews contract", { summary: "Napoli have agreed a new deal.", published_at: "2025-12-29T01:00:00Z" });
    const recent = article("Napoli appoints a coach", { id: 2 });
    expect(selectTeamNews([old, recent, old, article("Napoli copy", { id: 3, ai_generated: false }),
      article("Napoli held", { id: 4, quality_ok: false })], identity)).toEqual([recent, old]);
    expect(teamNewsIdentity(profile("football", "Napoli", { available: false }))).toBeNull();
    expect(teamNewsIdentity(profile("unregistered", "Napoli"))).toBeNull();
  });
  it("collects the second feed page and historical search, and reports partial failure", async () => {
    const identity = teamNewsIdentity(profile("football", "Napoli", { football_gender: "men" }));
    const inSummary = article("Defender renews", { summary: "Napoli have agreed a deal.", id: 501 });
    const archived = article("Napoli signs defender", { id: 502, published_at: "2025-09-01T01:00:00Z" });
    const api = { searchArticles: vi.fn().mockResolvedValue([archived]), getArticles: vi.fn()
      .mockResolvedValueOnce(Array.from({ length: 100 }, (_, n) => article("Unrelated team", { id: n + 1 })))
      .mockResolvedValueOnce([inSummary]) };
    expect((await loadTeamNews(identity, api)).rows).toEqual([inSummary, archived]);
    expect(api.getArticles.mock.calls[1][0]).toEqual({ sport: "football", sort: "newest", limit: 100, offset: 100 });
    api.getArticles.mockRejectedValue(new Error("network"));
    expect(await loadTeamNews(identity, api)).toEqual({ rows: [archived], partial: true });
  });
});
