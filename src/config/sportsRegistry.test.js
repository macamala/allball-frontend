import { describe, expect, it } from "vitest";
import {
  EVENT_MODELS,
  canonicalSportSlug,
  directorySports,
  followableRegistrySports,
  getRegistrySport,
  groupedDirectorySports,
  predictionMarketForSport,
  predictionRegistrySports,
} from "./sportsRegistry.js";

describe("sports registry fallback catalog", () => {
  it("keeps stable slugs and valid event models", () => {
    const sports = followableRegistrySports();
    const slugs = sports.map((row) => row.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    sports.forEach((row) => {
      expect(EVENT_MODELS).toContain(row.event_model);
    });
    expect(canonicalSportSlug("rugby-union")).toBe("rugby");
    expect(getRegistrySport("football").path).toBe("/football");
    expect(getRegistrySport("horse-racing").path).toBe("/sports/horse-racing");
    expect(getRegistrySport("golf").path).toBe("/golf");
  });

  it("derives Other Sports from the registry instead of a manual list", () => {
    const slugs = directorySports().map((row) => row.slug);
    expect(slugs).toContain("golf");
    expect(slugs).toContain("horse-racing");
    expect(slugs).toContain("esports");
    expect(slugs).not.toContain("football");
    const groups = groupedDirectorySports().map((row) => row.category);
    expect(groups).toContain("team");
    expect(groups).toContain("racing");
    expect(groups).toContain("esports");
  });

  it("keeps My Sports and Predictions capability rules honest", () => {
    const followable = followableRegistrySports().map((row) => row.slug);
    expect(followable).toContain("cricket");
    expect(followable).toContain("mma");
    const predicted = predictionRegistrySports().map((row) => row.slug);
    expect(predicted).toEqual(["football", "basketball", "tennis"]);
    expect(predictionMarketForSport("football")).toBe("1x2");
    expect(predictionMarketForSport("horse-racing")).toBe(null);
    expect(getRegistrySport("motorsport").supports_predictions).toBe(false);
  });
});
