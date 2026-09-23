import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import SiteFooter from "./components/SiteFooter.jsx";
import SiteHeader from "./components/SiteHeader.jsx";
import MobileNavDrawer from "./components/MobileNavDrawer.jsx";
import App from "./App.jsx";

function sourceOf(mod) {
  return readFileSync(new URL(mod, import.meta.url), "utf8");
}

describe("public Data Sources surface", () => {
  it("is absent from footer, desktop nav, mobile nav, and app routes", () => {
    const files = [
      sourceOf("./components/SiteFooter.jsx"),
      sourceOf("./components/SiteHeader.jsx"),
      sourceOf("./components/MobileNavDrawer.jsx"),
      sourceOf("./pages/LiveScoresPage.jsx"),
      sourceOf("./pages/MatchPage.jsx"),
      sourceOf("./components/ProviderPending.jsx"),
      sourceOf("./App.jsx"),
    ];
    for (const src of files) {
      expect(src).not.toMatch(/DataSourcesPage/);
      expect(src).not.toMatch(/footer\.dataSources/);
      expect(src).not.toMatch(/to="\/data-sources"/);
      expect(src).not.toMatch(/Powered\s+by/i);
      expect(src).not.toMatch(/SportScoreAttribution|sportscore\.com/i);
    }
    expect(sourceOf("./App.jsx")).toMatch(/path="\/data-sources"/);
    expect(sourceOf("./App.jsx")).toMatch(/Navigate to="\/"/);
    expect(App).toBeTypeOf("function");
    expect(SiteFooter).toBeTypeOf("function");
    expect(SiteHeader).toBeTypeOf("function");
    expect(MobileNavDrawer).toBeTypeOf("function");
  });
});
