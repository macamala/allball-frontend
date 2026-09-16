import React from "react";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach, vi } from "vitest";
import App from "./App.jsx";
import { clearPublicCache } from "./api.js";
import ArticleImage from "./components/ArticleImage.jsx";
import { sanitizeText } from "./lib/sanitize.js";

const sampleArticle = {
  id: 1,
  slug: "villa-win",
  title: "Aston Villa win late",
  summary: "A late goal decided the match.",
  content: "Aston Villa scored late.",
  sport: "football",
  league: "england-premier-league",
  sport_label: "Football",
  league_label: "Premier League",
  image_url: "https://example.com/broken.jpg",
  published_at: "2026-09-10T10:00:00Z",
  created_at: "2026-09-10T10:00:00Z",
  is_breaking: false,
  reading_time_minutes: 2,
  previous: null,
  next: null,
};

function jsonResponse(data, status = 200) {
  const body = JSON.stringify(data);
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => body,
  });
}

function mockFetch() {
  global.fetch = vi.fn((input, init = {}) => {
    const url = String(input);
    if (url.includes("/auth/providers")) {
      return jsonResponse({ password: true, google: false, facebook: false });
    }
    if (url.includes("/auth/session") || url.includes("/auth/csrf")) {
      return jsonResponse({ user: null, csrf: "test-csrf" });
    }
    if (url.includes("/comments")) {
      return jsonResponse({ count: 0, comments: [] });
    }
    if (url.includes("/articles/recent")) {
      return jsonResponse([
        sampleArticle,
        {
          ...sampleArticle,
          id: 7,
          slug: "other-latest",
          title: "Another late Premier League story",
        },
      ]);
    }
    if (url.includes("/articles/most-read")) {
      return jsonResponse([]);
    }
    if (url.includes("/portal/home")) {
      return jsonResponse({
        featured: [sampleArticle],
        latest: [
          {
            ...sampleArticle,
            id: 7,
            slug: "other-latest",
            title: "Another late Premier League story",
          },
        ],
        breaking: [],
        most_read: [
          {
            ...sampleArticle,
            id: 12,
            slug: "most-read-story",
            title: "Most read weekend story",
          },
        ],
        by_sport: {
          football: [
            sampleArticle,
            {
              ...sampleArticle,
              id: 21,
              slug: "football-section-story",
              title: "Serie A weekend round-up",
            },
          ],
          basketball: [],
          tennis: [],
          motorsport: [],
        },
        by_league: [],
        sports_data: { connected: false },
      });
    }
    if (url.includes("/articles/by-sport") || url.includes("/articles?")) {
      return jsonResponse([
        sampleArticle,
        {
          ...sampleArticle,
          id: 3,
          slug: "other-news",
          title: "Other news from the weekend",
        },
      ]);
    }
    if (url.includes("/articles/villa-win/related")) {
      return jsonResponse([]);
    }
    if (url.includes("/articles/villa-win/view") && init.method === "POST") {
      return jsonResponse({ ok: true, counted: true });
    }
    if (url.includes("/articles/villa-win")) {
      return jsonResponse(sampleArticle);
    }
    if (url.includes("/search")) {
      return jsonResponse([]);
    }
    if (url.includes("/meta/taxonomy")) {
      return jsonResponse({
        sports: [
          { sport: "golf", label: "Golf", group: "other", path: "/golf", article_count: 0 },
          { sport: "cricket", label: "Cricket", group: "other", path: "/cricket", article_count: 0 },
        ],
      });
    }
    if (url.includes("/meta/sports")) return jsonResponse(["football"]);
    if (url.includes("/meta/leagues")) return jsonResponse([]);
    if (url.includes("/sports-data/scores")) {
      return jsonResponse({ connected: false, matches: [], events: [], message: "not connected" });
    }
    if (url.includes("/sports-data/standings")) {
      return jsonResponse({ connected: false, rows: [] });
    }
    if (url.includes("/sports-data/competitions")) {
      return jsonResponse({ connected: false, competitions: [] });
    }
    if (url.includes("/sports-data/events")) {
      return jsonResponse({ connected: false, events: [], matches: [] });
    }
    if (url.includes("/sports-data/matches")) {
      return jsonResponse({ connected: false, header: null, event: null });
    }
    if (url.includes("/predictions/performance")) {
      return jsonResponse({ available: false, windows: { last_7_days: null } });
    }
    if (/\/predictions\/[^/?]+/.test(url)) {
      return jsonResponse({
        connected: false,
        event: null,
        prediction: null,
        evidence: [],
        message: "Predictions are being prepared. Live fixture data will appear here when sports data is connected.",
      });
    }
    if (url.includes("/predictions")) {
      return jsonResponse({
        connected: false,
        items: [],
        count: 0,
        performance_available: false,
        message: "Predictions are being prepared. Live fixture data will appear here when sports data is connected.",
      });
    }
    return jsonResponse([]);
  });
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  clearPublicCache();
});

describe("NinkoSports Phase 3 routes", () => {
  beforeEach(() => {
    mockFetch();
  });

  it("renders homepage without crashing", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(screen.getAllByText(/NinkoSports/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole("link", { name: "Home" }).length).toBeGreaterThan(0);
    const leadImg = document.querySelector(".hero-lead img");
    if (leadImg) {
      expect(leadImg.getAttribute("loading")).toBe("eager");
    }
    document.querySelectorAll(".card-media img, .news-stream-thumb img, .hero-side-media img").forEach((img) => {
      expect(img.getAttribute("loading")).toBe("lazy");
    });
  });

  it("upgrades homepage top story away from a 240px CDN token", async () => {
    const bbcThumb =
      "https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/live/title-race.jpg";
    global.fetch = vi.fn((input, init = {}) => {
      const url = String(input);
      if (url.includes("/auth/providers")) {
        return jsonResponse({ password: true, google: false, facebook: false });
      }
      if (url.includes("/auth/session") || url.includes("/auth/csrf")) {
        return jsonResponse({ user: null, csrf: "test-csrf" });
      }
      if (url.includes("/portal/home")) {
        return jsonResponse({
          featured: [
            { ...sampleArticle, image_url: bbcThumb },
            {
              ...sampleArticle,
              id: 2,
              slug: "side-story",
              title: "A second Premier League story",
              image_url: bbcThumb,
            },
          ],
          latest: [
            {
              ...sampleArticle,
              id: 7,
              slug: "other-latest",
              title: "Another late Premier League story",
              image_url: bbcThumb,
            },
          ],
          breaking: [],
          most_read: [
            {
              ...sampleArticle,
              id: 12,
              slug: "most-read-one",
              title: "Most read Premier League story",
              image_url: bbcThumb,
            },
          ],
          by_sport: {},
          by_league: [],
          sports_data: { connected: false, matches: [] },
        });
      }
      return jsonResponse([]);
    });
    renderAt("/");
    await waitFor(() => {
      expect(document.querySelector(".hero-lead img")).toBeTruthy();
    });
    const lead = document.querySelector(".hero-lead img");
    expect(lead.getAttribute("src")).toContain("/1280/");
    expect(lead.getAttribute("src")).not.toContain("/240/");
    expect(lead.getAttribute("loading")).toBe("eager");
    const latestThumb = document.querySelector(".news-stream-thumb img");
    if (latestThumb) {
      expect(latestThumb.getAttribute("src")).toContain("/320/");
      expect(latestThumb.getAttribute("src")).not.toContain("/1600/");
      expect(latestThumb.getAttribute("loading")).toBe("lazy");
    }
    const mostRead = document.querySelector(".most-read-thumb img");
    if (mostRead) {
      expect(mostRead.getAttribute("src")).toContain("/320/");
      expect(mostRead.getAttribute("src")).not.toContain("/1600/");
    }
  });

  it("renders football page without crashing", async () => {
    renderAt("/football");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Football" })).toBeInTheDocument();
    });
  });

  it("renders search no-results state", async () => {
    renderAt("/search?q=zzzz-no-hit");
    await waitFor(() => {
      expect(screen.getByText(/No results/i)).toBeInTheDocument();
    });
  });

  it("renders league provider-pending for standings", async () => {
    renderAt("/football/premier-league");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Premier League" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("tab", { name: "Standings" }));
    expect(
      screen.getByText(/Standings coming when live data is connected/i)
    ).toBeInTheDocument();
  });

  it("article image fails gracefully without a broken-image icon", () => {
    const { container } = render(
      <ArticleImage src="https://invalid.example/missing.jpg" alt="Story" />
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".media-fallback")).toBeTruthy();
  });

    it("opens mobile menu", async () => {
      renderAt("/");
      fireEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("renders article body without source_url or contamination", async () => {
      renderAt("/article/villa-win");
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Aston Villa win late" })
        ).toBeInTheDocument();
      });
      expect(screen.getByText("Aston Villa scored late.")).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/source_url/i);
      expect(document.body.textContent).not.toMatch(/Menu ESPN/i);
      expect(document.querySelector(".article-layout")).toBeTruthy();
      expect(screen.queryByLabelText("Latest news")).not.toBeInTheDocument();
    });

  describe("article editorial experience", () => {
    beforeEach(() => {
      const related = {
        id: 2,
        slug: "related-real",
        title: "Arsenal stay top after another late win",
        image_url: "https://example.com/related.jpg",
      };
      const dirty = {
        id: 9,
        slug: "odegaard-story",
        title: "Who needs a forward? Arsenal might, but not while Ødegaard keeps delivering",
        summary: "Arsenal found a way through in Naples.",
        content:
          "Menu ESPN <![CDATA[Arsenal won late.]]> [+1234 chars] The 27-year-old fired the winning goal.",
        blocks: [
          { type: "paragraph", text: "Menu ESPN The 27-year-old fired the winning goal on 75 minutes." },
          { type: "paragraph", text: "Arsenal had wasted chances before the winner arrived." },
          { type: "paragraph", text: "The visitors could not find a reply in the closing stages." },
          {
            type: "related",
            article: related,
          },
          { type: "paragraph", text: "Unai Emery's side now look ahead to the next fixture." },
          {
            type: "media",
            url: "https://example.com/inline.jpg",
            caption: "Celebration",
            is_hero: false,
          },
        ],
        media: [
          {
            url: "https://example.com/hero.jpg",
            is_hero: true,
            caption: "",
          },
          {
            url: "https://example.com/inline.jpg",
            is_hero: false,
            caption: "Celebration",
          },
        ],
        sport: "football",
        league: "england-premier-league",
        sport_label: "Football",
        league_label: "Premier League",
        image_url: "https://example.com/hero.jpg",
        published_at: "2026-09-10T10:00:00Z",
        created_at: "2026-09-10T10:00:00Z",
        reading_time_minutes: 4,
        previous: null,
        next: null,
      };
      global.fetch = vi.fn((input, init = {}) => {
        const url = String(input);
        if (url.includes("/auth/session") || url.includes("/auth/csrf")) {
          return jsonResponse({ user: null, csrf: "test-csrf" });
        }
        if (url.includes("/comments")) {
          return jsonResponse({ count: 0, comments: [] });
        }
        if (url.includes("/articles/recent")) return jsonResponse([sampleArticle]);
        if (url.includes("/articles/odegaard-story/related")) return jsonResponse([related]);
        if (url.includes("/articles/odegaard-story/view") && init.method === "POST") {
          return jsonResponse({ ok: true, counted: true });
        }
        if (url.includes("/articles/odegaard-story")) return jsonResponse(dirty);
        if (url.includes("/articles/hero-only")) {
          return jsonResponse({
            ...dirty,
            id: 10,
            slug: "hero-only",
            title: "Aston Villa earn a point against Arsenal",
            blocks: [{ type: "paragraph", text: "Aston Villa earned a late point against Arsenal." }],
            media: [{ url: "https://example.com/hero.jpg", is_hero: true }],
            image_url: "https://example.com/hero.jpg",
          });
        }
        if (url.includes("/articles?")) return jsonResponse([sampleArticle]);
        if (url.includes("/articles/most-read")) return jsonResponse([]);
        if (url.includes("/sports-data/scores")) {
          return jsonResponse({ connected: false, matches: [] });
        }
        if (url.includes("/meta/sports")) return jsonResponse(["football"]);
        if (url.includes("/meta/leagues")) return jsonResponse([]);
        return jsonResponse([]);
      });
    });

    it("strips Menu ESPN, CDATA and truncation on the article page", async () => {
      renderAt("/article/odegaard-story");
      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      });
      expect(document.body.textContent).not.toMatch(/Menu ESPN/);
      expect(document.body.textContent).not.toMatch(/<!\[CDATA/);
      expect(document.body.textContent).not.toMatch(/\[\+1234 chars\]/);
      expect(screen.getByText(/winning goal/i)).toBeInTheDocument();
      expect(screen.getAllByText("Arsenal stay top after another late win").length).toBeGreaterThan(0);
      expect(document.body.textContent).not.toMatch(/source_url/);
    });

    it("keeps a single hero when there is no extra media", async () => {
      renderAt("/article/hero-only");
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Aston Villa earn a point against Arsenal" })
        ).toBeInTheDocument();
      });
      expect(document.querySelectorAll(".article-hero").length).toBeGreaterThan(0);
      expect(document.querySelector(".article-inline-media")).toBeNull();
      expect(document.querySelector(".article-layout")).toBeTruthy();
    });
  });
});

describe("presentation sanitizer", () => {
  it("removes Menu ESPN, CDATA, truncation and duplicated titles", () => {
    const title = "Villa won the match";
    const cleaned = sanitizeText(
      "<![CDATA[Villa won the match.]]> Menu ESPN more Villa news [+1234 chars] The visitors could not reply.",
      title
    );
    expect(cleaned).not.toMatch(/Menu ESPN/i);
    expect(cleaned).not.toMatch(/CDATA/i);
    expect(cleaned).not.toMatch(/\[\+/);
    expect(cleaned).toMatch(/Villa/);
  });

  it("strips social chrome from article prose", () => {
    const cleaned = sanitizeText(
      "Como won 4-1. Watch now on TNT Sports pic.twitter.com/abcd Football on TNT Sports (@footballontnt) September 10, 2026",
      "Como 4-1 RB Leipzig"
    );
    expect(cleaned).toMatch(/Como won 4-1/);
    expect(cleaned).not.toMatch(/pic\.twitter\.com/);
    expect(cleaned).not.toMatch(/Watch now on/);
    expect(cleaned).not.toMatch(/@footballontnt/);
  });

  it("drops CMS crumbs and duplicate titles without deleting those words in prose", () => {
    const title = "Is the Premier League already a two-team title race?";
    const cleaned = sanitizeText(
      "Top Scorers Gossip Is the Premier League already a two-team title race? Haaland scores a controversial winner.",
      title
    );
    expect(cleaned).not.toMatch(/Top Scorers/);
    expect(cleaned).not.toMatch(/^Gossip/i);
    expect(cleaned).not.toMatch(title);
    expect(cleaned).toMatch(/Haaland scores a controversial winner/);
    const prose = sanitizeText(
      "Persistent gossip swirling around the club will not distract the manager.",
      "Club stay calm amid transfer talk"
    );
    expect(prose).toMatch(/Persistent gossip swirling around the club/);
  });
});

describe("Phase 4 portal and account UX", () => {
  beforeEach(() => {
    mockFetch();
  });

  it("renders larger branding and expands the editorial center when live rails are hidden", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(screen.getAllByText(/NinkoSports/).length).toBeGreaterThan(0);
    });
    const logo = document.querySelector(".site-header-logo");
    expect(Number(logo.getAttribute("width"))).toBeGreaterThanOrEqual(48);
    expect(document.querySelector(".site-header-name")).toBeTruthy();
    expect(document.querySelector(".portal-shell")).toBeTruthy();
    expect(document.querySelector(".portal-left")).toBeNull();
    expect(document.querySelector(".portal-right")).toBeNull();
    expect(document.querySelector(".portal-shell.is-expanded")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/1-0|Live now/);
  });

  it("keeps card titles out of the image region", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(screen.getAllByText(/Aston Villa win late/).length).toBeGreaterThan(0);
    });
    document.querySelectorAll(".article-card").forEach((card) => {
      const media = card.querySelector(".card-media");
      const title = card.querySelector(".article-card-title");
      expect(media && title && media.contains(title)).toBe(false);
    });
  });

  it("excludes mismatched sport stories from sport pages", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/articles")) {
        return jsonResponse([
          {
            ...sampleArticle,
            id: 21,
            slug: "f1-grid",
            title: "Formula 1 drivers prepare for the next Grand Prix",
            sport: "motorsport",
            sport_label: "Motorsport",
            sport_match_ok: true,
          },
          {
            ...sampleArticle,
            id: 22,
            slug: "wrong-football",
            title: "Arsenal beat Liverpool in the Premier League",
            sport: "motorsport",
            sport_label: "Motorsport",
            sport_match_ok: false,
          },
        ]);
      }
      return jsonResponse([]);
    });
    renderAt("/motorsport");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Motorsport" })).toBeInTheDocument();
    });
    expect(screen.getByText(/Formula 1 drivers/)).toBeInTheDocument();
    expect(screen.queryByText(/Arsenal beat Liverpool/)).not.toBeInTheDocument();
  });

  it("uses a compact layout for brief articles and a larger layout for long articles", async () => {
    global.fetch = vi.fn((input, init = {}) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/comments")) return jsonResponse({ count: 0, comments: [] });
      if (url.includes("/articles/dillon-brief")) {
        return jsonResponse({
          ...sampleArticle,
          slug: "dillon-brief",
          title: "Dillon Jones signs a short-term deal",
          presentation_type: "brief",
          blocks: [{ type: "paragraph", text: "Dillon Jones has signed a short-term deal." }],
        });
      }
      if (url.includes("/articles/arsenal-long")) {
        return jsonResponse({
          ...sampleArticle,
          id: 8,
          slug: "arsenal-long",
          title: "Arsenal stay top after another late win",
          presentation_type: "major",
          blocks: [
            { type: "paragraph", text: "Arsenal stayed top after another late win in a long night." },
            { type: "paragraph", text: "The visitors could not find a reply in the closing stages." },
          ],
        });
      }
      if (url.includes("/articles/recent") || url.includes("/articles?")) {
        return jsonResponse([sampleArticle]);
      }
      if (url.includes("/articles/most-read")) return jsonResponse([]);
      if (url.includes("/sports-data/scores")) {
        return jsonResponse({ connected: false, matches: [] });
      }
      return jsonResponse([]);
    });
    renderAt("/article/dillon-brief");
    await waitFor(() => {
      expect(document.querySelector(".article-page.is-brief")).toBeTruthy();
    });
    renderAt("/article/arsenal-long");
    await waitFor(() => {
      expect(document.querySelector(".article-page.is-major")).toBeTruthy();
    });
  });

  it("shows mobile login, register, comments, My Sports and language controls", async () => {
    const login = renderAt("/login");
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    login.unmount();
    const register = renderAt("/register");
    expect(screen.getByLabelText(/Display name/i)).toBeInTheDocument();
    register.unmount();
    renderAt("/article/villa-win");
    await waitFor(() => {
      expect(screen.getByText(/Sign in to comment/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getAllByLabelText("Language").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/My Sports/).length).toBeGreaterThan(0);
  });
});

describe("Phase 4.1 taxonomy, i18n and layout", () => {
  beforeEach(() => {
    mockFetch();
    window.localStorage.clear();
  });

  it("shows resolved competition badges and omits unknown ones", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/providers")) {
        return jsonResponse({ password: true, google: false, facebook: false });
      }
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/portal/home")) {
        return jsonResponse({
          featured: [
            {
              ...sampleArticle,
              slug: "ucl-liveblog",
              title: "Champions League Liveblog: Napoli vs Arsenal",
              league: "uefa-champions-league",
              league_label: "UEFA Champions League",
            },
            {
              ...sampleArticle,
              id: 4,
              slug: "serie-wrong-tag",
              title: "Napoli vs Bologna — Serie A probable line-ups",
              league: "italy-serie-a",
              league_label: "Serie A",
            },
            {
              ...sampleArticle,
              id: 5,
              slug: "unknown-comp",
              title: "A busy night across Europe",
              league: null,
              league_label: null,
            },
          ],
          latest: [],
          breaking: [],
          most_read: [],
          by_sport: {},
          by_league: [],
          sports_data: { connected: false, matches: [] },
        });
      }
      return jsonResponse([]);
    });
    renderAt("/");
    await waitFor(() => {
      expect(screen.getAllByText("UEFA Champions League").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Serie A").length).toBeGreaterThan(0);
    const unknown = screen.getByText("A busy night across Europe").closest("article");
    expect(unknown.textContent).not.toMatch(/Premier League|Serie A|UEFA Champions League/);
  });

  it("keeps NBA and EuroLeague pages from mixing and isolates tennis/motorsport", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/articles")) {
        if (url.includes("nba")) {
          return jsonResponse([
            {
              ...sampleArticle,
              sport: "basketball",
              league: "nba",
              league_label: "NBA",
              sport_label: "Basketball",
              title: "Lakers and 76ers meet in a heavy NBA night",
              sport_match_ok: true,
            },
          ]);
        }
        if (url.includes("euroleague")) {
          return jsonResponse([
            {
              ...sampleArticle,
              id: 8,
              sport: "basketball",
              league: "euroleague",
              league_label: "EuroLeague",
              title: "EuroLeague shareholders face major decisions",
              sport_match_ok: true,
            },
          ]);
        }
        if (url.includes("tennis") || url.includes("motorsport")) {
          return jsonResponse([]);
        }
        if (url.includes("football")) {
          return jsonResponse([sampleArticle]);
        }
      }
      return jsonResponse({ user: null, csrf: "test-csrf" });
    });
    const nba = renderAt("/basketball/nba");
    await waitFor(() => {
      expect(screen.getByText(/Lakers and 76ers/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/EuroLeague shareholders/)).not.toBeInTheDocument();
    nba.unmount();
    const euro = renderAt("/basketball/euroleague");
    await waitFor(() => {
      expect(screen.getByText(/EuroLeague shareholders/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Lakers and 76ers/)).not.toBeInTheDocument();
    euro.unmount();
    renderAt("/tennis");
    await waitFor(() => {
      expect(document.querySelector(".empty-state.is-compact")).toBeTruthy();
    });
    expect(screen.queryByText(/Aston Villa/)).not.toBeInTheDocument();
  });

  it("translates Serbian site-owned UI and keeps official competition names", async () => {
    window.localStorage.setItem("ninkosports.lang", "sr");
    renderAt("/");
    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: "Početna" }).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Fudbal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Košarka").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tenis").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ostali sportovi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rezultati uživo").length).toBeGreaterThan(0);
    expect(screen.getByText("Najnovije")).toBeInTheDocument();
    expect(screen.getByText("Najčitanije")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Premier League").length).toBeGreaterThan(0);
  });

  it("covers translation keys for every supported language", async () => {
    const { canonicalKeys, missingKeys, DICTS } = await import("./i18n/index.js");
    const keys = canonicalKeys();
    expect(keys.length).toBeGreaterThan(80);
    Object.keys(DICTS).forEach((lang) => {
      expect(missingKeys(lang)).toEqual([]);
    });
  });

  it("formats date-only timestamps without midnight", async () => {
    const { articleDate } = await import("./labels.js");
    expect(articleDate({ published_at: "2026-09-13T00:00:00Z" }, "en-GB")).not.toMatch(/\d{1,2}:\d{2}/);
    expect(articleDate({ published_at: "2026-09-13T00:00:00" }, "en-GB")).not.toMatch(/\d{1,2}:\d{2}/);
    expect(articleDate({ published_at: "2026-09-13T18:30:00Z" }, "en-GB")).toMatch(/\d{1,2}:\d{2}/);
  });

  it("hides Google and Facebook when credentials are off and toggles password visibility", async () => {
    renderAt("/login");
    expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Continue with Facebook/i)).not.toBeInTheDocument();
    const password = screen.getByLabelText(/^Password$/i);
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: /Show password/i }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("keeps a readable article column and a smaller brief hero", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/comments")) return jsonResponse({ count: 0, comments: [] });
      if (url.includes("/articles/dillon-brief")) {
        return jsonResponse({
          ...sampleArticle,
          slug: "dillon-brief",
          title: "Dillon Jones signs a short-term deal",
          presentation_type: "brief",
          blocks: [{ type: "paragraph", text: "Dillon Jones has signed a short-term deal." }],
        });
      }
      return jsonResponse([]);
    });
    renderAt("/article/dillon-brief");
    await waitFor(() => {
      expect(document.querySelector(".article-page.is-brief")).toBeTruthy();
    });
    expect(document.querySelector(".article-column")).toBeTruthy();
    expect(document.querySelector(".article-shell")).toBeTruthy();
    expect(document.querySelector(".portal-left")).toBeNull();
  });
});

describe("Phase 4.2 homepage and article editorial", () => {
  beforeEach(() => {
    mockFetch();
    window.localStorage.clear();
  });

  it("does not repeat the hero immediately in Latest News", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(screen.getByText("Top Stories")).toBeInTheDocument();
    });
    const latest = document.querySelector(".latest-feed");
    expect(latest).toBeTruthy();
    expect(latest.textContent).not.toMatch(/Aston Villa win late/);
    expect(latest.textContent).toMatch(/Another late Premier League story/);
    const ids = [...document.querySelectorAll(".page-home .article-card, .hero-lead, .hero-side-item")].map(
      (node) => node.textContent
    );
    const villaHits = document.body.textContent.split("Aston Villa win late").length - 1;
    expect(villaHits).toBeLessThan(4);
    expect(screen.getByRole("heading", { name: "Football" })).toBeInTheDocument();
    expect(screen.getByText("Serie A weekend round-up")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tennis" })).not.toBeInTheDocument();
  });

  it("hides Most Read when there is no real popularity data", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/portal/home")) {
        return jsonResponse({
          featured: [sampleArticle],
          latest: [{ ...sampleArticle, id: 9, slug: "latest-two", title: "A second football story" }],
          breaking: [],
          most_read: [],
          by_sport: { football: [], basketball: [], tennis: [], motorsport: [] },
          by_league: [],
          sports_data: { connected: false, matches: [] },
        });
      }
      return jsonResponse([]);
    });
    renderAt("/");
    await waitFor(() => {
      expect(screen.getByText("Top Stories")).toBeInTheDocument();
    });
    expect(screen.queryByText("Most Read")).not.toBeInTheDocument();
    expect(document.querySelector(".portal-right")).toBeNull();
  });

  it("uses a compact brief hero and a larger standard hero", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/comments")) return jsonResponse({ count: 0, comments: [] });
      if (url.includes("/articles/dillon-brief")) {
        return jsonResponse({
          ...sampleArticle,
          slug: "dillon-brief",
          presentation_type: "brief",
          blocks: [{ type: "paragraph", text: "Dillon Jones has signed a short-term deal." }],
        });
      }
      if (url.includes("/articles/spurs-standard/related")) {
        return jsonResponse([
          {
            ...sampleArticle,
            id: 31,
            slug: "spurs-related",
            title: "Tottenham look for a first Premier League goal",
            league: "england-premier-league",
            league_label: "Premier League",
          },
        ]);
      }
      if (url.includes("/articles/spurs-standard")) {
        return jsonResponse({
          ...sampleArticle,
          id: 30,
          slug: "spurs-standard",
          title: "De Zerbi under pressure: Tottenham still without a goal after 4 games",
          presentation_type: "standard",
          blocks: [
            { type: "paragraph", text: "Tottenham are still searching for a first Premier League goal." },
            { type: "paragraph", text: "De Zerbi asked for patience after four matches without a strike." },
          ],
          previous: { slug: "pl-old", title: "Liverpool hold Chelsea in the Premier League" },
          next: { slug: "pl-new", title: "Another Premier League night" },
        });
      }
      return jsonResponse([]);
    });
    const brief = renderAt("/article/dillon-brief");
    await waitFor(() => {
      expect(document.querySelector(".article-page.is-brief")).toBeTruthy();
    });
    expect(document.querySelector(".article-shell")).toBeTruthy();
    brief.unmount();
    renderAt("/article/spurs-standard");
    await waitFor(() => {
      expect(document.querySelector(".article-page.is-standard")).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText(/Tottenham look for a first Premier League goal/)).toBeInTheDocument();
    });
    expect(document.body.textContent).not.toMatch(/Required fields are marked/);
    expect(document.body.textContent).not.toMatch(/Notify me of follow-up comments/);
    expect(document.querySelector(".article-pager")).toBeTruthy();
  });

  it("keeps Serbian homepage chrome translated", async () => {
    window.localStorage.setItem("ninkosports.lang", "sr");
    renderAt("/");
    await waitFor(() => {
      expect(screen.getByText("Najvažnije")).toBeInTheDocument();
    });
    expect(screen.getByText("Najnovije")).toBeInTheDocument();
    expect(screen.getByText("Najčitanije")).toBeInTheDocument();
  });
});

describe("Phase 4.3 brand, homepage and article presentation", () => {
  beforeEach(() => {
    mockFetch();
    window.localStorage.clear();
  });

  it("locks NinkoSports navy and blue design tokens", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "styles.css"), "utf8");
    expect(css).toMatch(/NinkoSports brand palette — do not replace globally without an explicit brand redesign requirement/);
    expect(css).toMatch(/--ns-bg:\s*#061422/);
    expect(css).toMatch(/--ns-blue:\s*#3b82ff/);
    expect(css).toMatch(/--ns-teal:\s*#2dd4bf/);
    expect(css).toMatch(/--ns-surface:\s*#102844/);
    expect(css).toMatch(/--ns-article-width:\s*840px/);
    expect(css).toMatch(/\.article-hero\s*\{[^}]*max-width:\s*100%/s);
    expect(css).not.toMatch(/\.article-hero\s*\{[^}]*max-width:\s*1100px/s);
  });

  it("uses a lead desk, latest stream and numbered Most Read", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(document.querySelector(".hero-lead-copy")).toBeTruthy();
    });
    expect(document.querySelector(".hero-lead-link")).toBeTruthy();
    expect(document.querySelector(".latest-feed.news-stream")).toBeTruthy();
    expect(document.querySelector(".news-stream-item")).toBeTruthy();
    expect(document.querySelector(".most-read-list")).toBeTruthy();
    expect(document.querySelector(".most-read-rank")?.textContent).toBe("01");
    expect(document.querySelector(".sport-desk")).toBeTruthy();
    document.querySelectorAll(".article-card").forEach((card) => {
      const media = card.querySelector(".card-media");
      const title = card.querySelector(".article-card-title");
      expect(media && title && media.contains(title)).toBe(false);
    });
    document.querySelectorAll(".news-stream-item").forEach((row) => {
      const media = row.querySelector(".news-stream-thumb");
      const title = row.querySelector("h3");
      expect(media && title && media.contains(title)).toBe(false);
    });
  });

  it("hides photo credits under the hero and strips social chrome from prose", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/comments")) return jsonResponse({ count: 0, comments: [] });
      if (url.includes("/articles/como-ucl/related")) {
        return jsonResponse([
          {
            ...sampleArticle,
            id: 41,
            slug: "ucl-related",
            title: "Arsenal prepare for the next Champions League night",
            league: "uefa-champions-league",
            league_label: "UEFA Champions League",
          },
        ]);
      }
      if (url.includes("/articles/como-ucl")) {
        return jsonResponse({
          ...sampleArticle,
          slug: "como-ucl",
          title: "Como 4-1 RB Leipzig",
          presentation_type: "major",
          blocks: [
            {
              type: "caption",
              text: "COMO, ITALY - SEPTEMBER 10: Como players celebrate (Photo by Getty Images)",
            },
            {
              type: "paragraph",
              text: "Como completed a stunning Champions League debut with a 4-1 win over RB Leipzig.",
            },
            {
              type: "paragraph",
              text: "Watch now on TNT Sports & HBO Max pic.twitter.com/abcd1234 Football on TNT Sports (@footballontnt) September 10, 2026",
            },
          ],
          media: [
            {
              url: "https://example.com/hero.jpg",
              is_hero: true,
              caption: "COMO, ITALY - SEPTEMBER 10: Como players celebrate (Photo by Getty Images)",
            },
          ],
          previous: { slug: "ucl-old", title: "Napoli hold Arsenal in the Champions League" },
          next: { slug: "ucl-new", title: "Another UEFA Champions League night" },
        });
      }
      return jsonResponse([]);
    });
    renderAt("/article/como-ucl");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Como 4-1 RB Leipzig" })).toBeInTheDocument();
    });
    expect(document.querySelector("figcaption")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Getty Images/);
    expect(document.body.textContent).not.toMatch(/Photo by/);
    expect(document.querySelector(".article-hero img")?.getAttribute("loading")).toBe("eager");
    expect(document.querySelector(".article-hero img")?.getAttribute("alt")).toBe("Como 4-1 RB Leipzig");
    expect(document.querySelector(".article-paragraph")?.textContent).toMatch(/Champions League debut/);
    expect(document.body.textContent).not.toMatch(/pic\.twitter\.com/);
    expect(document.body.textContent).not.toMatch(/Watch now on/);
    expect(document.body.textContent).not.toMatch(/@footballontnt/);
    expect(document.querySelector(".article-column .article-hero")).toBeTruthy();
    expect(document.querySelector(".article-column .article-body")).toBeTruthy();
    expect(document.querySelector(".pager-card")).toBeTruthy();
    expect(document.querySelector(".pager-card.is-empty")).toBeNull();
    expect(document.querySelector(".article-related-grid")).toBeTruthy();
    expect(document.querySelector(".article-actions")).toBeTruthy();
    expect(document.querySelector(".comments-panel")).toBeTruthy();
    expect(document.querySelector(".comment-sort")).toBeTruthy();
  });

  it("does not render a blank previous or next placeholder", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/comments")) return jsonResponse({ count: 0, comments: [] });
      if (url.includes("/articles/pager-one/related")) return jsonResponse([]);
      if (url.includes("/articles/pager-one")) {
        return jsonResponse({
          ...sampleArticle,
          slug: "pager-one",
          title: "A late derby winner settles the night",
          blocks: [
            { type: "paragraph", text: "The visiting side found a late derby winner." },
          ],
          previous: { slug: "older-story", title: "An earlier night in the same league" },
        });
      }
      return jsonResponse([]);
    });
    renderAt("/article/pager-one");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "A late derby winner settles the night" })).toBeInTheDocument();
    });
    expect(document.querySelectorAll(".pager-card").length).toBe(1);
    expect(document.querySelector(".pager-card.is-empty")).toBeNull();
    expect(document.querySelector(".article-pager.is-single")).toBeTruthy();
  });

  it("uses compact treatment for crest media instead of a giant hero", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/comments")) return jsonResponse({ count: 0, comments: [] });
      if (url.includes("/articles/crest-story/related")) return jsonResponse([]);
      if (url.includes("/articles/crest-story")) {
        return jsonResponse({
          ...sampleArticle,
          slug: "crest-story",
          title: "A club night decided in the final minutes",
          sport: "basketball",
          league: "liga-acb",
          league_label: "Liga ACB",
          hero_media_kind: "CREST_OR_LOGO",
          image_url: "https://cdn.example.com/clubs/team-logo.png",
          presentation_type: "brief",
          media: [
            {
              url: "https://cdn.example.com/clubs/team-logo.png",
              is_hero: true,
              presentation: "CREST_OR_LOGO",
            },
          ],
          blocks: [{ type: "paragraph", text: "The visiting side closed the fourth quarter." }],
        });
      }
      return jsonResponse([]);
    });
    renderAt("/article/crest-story");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "A club night decided in the final minutes" })).toBeInTheDocument();
    });
    expect(document.querySelector(".article-hero.is-crest")).toBeTruthy();
    expect(document.querySelector(".media-kind-crest")).toBeTruthy();
    expect(document.querySelector(".article-page.is-crest-media")).toBeTruthy();
  });

  it("renders an article without a hero image and without a broken-image icon", async () => {
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/comments")) return jsonResponse({ count: 0, comments: [] });
      if (url.includes("/articles/no-photo/related")) return jsonResponse([]);
      if (url.includes("/articles/no-photo")) {
        return jsonResponse({
          ...sampleArticle,
          slug: "no-photo",
          title: "A late point earned without a photo",
          image_url: null,
          hero_media_kind: "MISSING",
          media: [],
          blocks: [
            { type: "paragraph", text: "Aston Villa earned a late point against Arsenal." },
          ],
        });
      }
      return jsonResponse([]);
    });
    renderAt("/article/no-photo");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "A late point earned without a photo" })
      ).toBeInTheDocument();
    });
    expect(document.querySelector(".article-hero img")).toBeNull();
    expect(document.querySelector(".article-hero-empty")).toBeTruthy();
    expect(document.querySelector(".article-paragraph")?.textContent).toMatch(/late point/);
  });

  it("does not hardcode acceptance fixture titles in production UI", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = dirname(fileURLToPath(import.meta.url));
    const files = [
      "components/article/ArticleHero.jsx",
      "components/article/ArticleMediaBlock.jsx",
      "components/ArticleCard.jsx",
      "components/HeroStories.jsx",
      "pages/ArticlePage.jsx",
      "lib/mediaKind.js",
    ];
    const forbidden = [
      "Barcelona claims Catalan crown",
      "Dario Brizuela",
      "Como 4-1 RB Leipzig",
      "Dillon Jones",
    ];
    for (const file of files) {
      const text = readFileSync(resolve(root, file), "utf8");
      for (const needle of forbidden) {
        expect(text).not.toContain(needle);
      }
    }
  });

  it("keeps new Phase 4.3 chrome translated in Serbian", async () => {
    window.localStorage.setItem("ninkosports.lang", "sr");
    renderAt("/");
    await waitFor(() => {
      expect(screen.getByText("Redakcija")).toBeInTheDocument();
    });
    expect(screen.getByText("Najnovije")).toBeInTheDocument();
  });
});

describe("Mobile UX V2", () => {
  beforeEach(() => {
    mockFetch();
    window.localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("opens and closes the mobile drawer and restores body scroll", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(document.body.classList.contains("nav-open")).toBe(true);
    expect(document.documentElement.classList.contains("nav-open")).toBe(true);
    expect(screen.getByRole("dialog", { name: "NinkoSports" })).toBeInTheDocument();
    expect(document.querySelector(".mobile-drawer-scroll")).toBeTruthy();
    expect(document.querySelectorAll(".mobile-drawer-scroll a, .mobile-drawer-scroll button").length).toBeGreaterThan(12);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.body.classList.contains("nav-open")).toBe(false);
    expect(document.documentElement.classList.contains("nav-open")).toBe(false);
    expect(screen.queryByRole("dialog", { name: "NinkoSports" })).not.toBeInTheDocument();
  });

  it("lets More on the bottom nav open the drawer", () => {
    renderAt("/");
    expect(document.querySelector(".mobile-bottom-nav")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("dialog", { name: "NinkoSports" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.classList.contains("nav-open")).toBe(false);
  });

  it("keeps bottom navigation and drawer scroll rules inside the mobile breakpoint", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "styles.css"), "utf8");
    expect(css).toMatch(/\.mobile-drawer-scroll\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.mobile-bottom-nav\s*\{[^}]*display:\s*none/s);
    expect(css).toMatch(/@media \(max-width: 960px\)[\s\S]*\.mobile-bottom-nav\s*\{[\s\S]*display:\s*block/);
    expect(css).toMatch(/\.mobile-bottom-nav-scroller\s*\{[^}]*overflow-x:\s*auto/s);
  });

  it("renders comments before previous/next and related stories", async () => {
    renderAt("/article/villa-win");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Aston Villa win late" })).toBeInTheDocument();
    });
    const body = document.querySelector(".article-body");
    const comments = document.querySelector(".comments-panel");
    const pager = document.querySelector(".article-pager");
    const related = document.querySelector(".article-related-section");
    expect(comments?.id).toBe("comments");
    expect(body.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (pager) {
      expect(comments.compareDocumentPosition(pager) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    if (related) {
      expect(comments.compareDocumentPosition(related) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByRole("heading", { name: "Comments (0)" })).toBeInTheDocument();
    expect(screen.getByText("No comments yet")).toBeInTheDocument();
  });

  it("scrolls the comments shortcut to the real comments section", async () => {
    renderAt("/article/villa-win");
    await waitFor(() => {
      expect(document.getElementById("comments")).toBeTruthy();
    });
    const shortcuts = screen.getAllByRole("button", { name: /Comments 0/ });
    fireEvent.click(shortcuts[0]);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("keeps saved-article toggling intact", async () => {
    renderAt("/article/villa-win");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save article" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Save article" }));
    expect(screen.getAllByRole("button", { name: "Saved" }).length).toBeGreaterThan(0);
  });

  it("posts a comment through the existing comments composer", async () => {
    let posted = false;
    global.fetch = vi.fn((input, init = {}) => {
      const url = String(input);
      const method = init.method || "GET";
      if (url.includes("/auth/providers")) {
        return jsonResponse({ password: true, google: false, facebook: false });
      }
      if (url.includes("/auth/session") || url.includes("/auth/csrf")) {
        return jsonResponse({
          user: { id: 9, display_name: "Alex", preferred_language: "en" },
          csrf: "test-csrf",
        });
      }
      if (url.includes("/auth/favorites")) {
        return jsonResponse({ sports: [], leagues: [], teams: [] });
      }
      if (url.includes("/auth/saved")) return jsonResponse([]);
      if (url.includes("/comments") && method === "POST") {
        posted = true;
        return jsonResponse({ ok: true });
      }
      if (url.includes("/comments")) {
        return jsonResponse({
          count: posted ? 1 : 0,
          comments: posted
            ? [
                {
                  id: 44,
                  body: "Great finish",
                  created_at: "2026-09-10T11:00:00Z",
                  author: { display_name: "Alex" },
                  like_count: 0,
                },
              ]
            : [],
        });
      }
      if (url.includes("/articles/villa-win/related")) return jsonResponse([]);
      if (url.includes("/articles/villa-win")) return jsonResponse(sampleArticle);
      return jsonResponse([]);
    });
    renderAt("/article/villa-win");
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your opinion…")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Share your opinion…"), {
      target: { value: "Great finish" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
    await waitFor(() => {
      expect(screen.getByText("Great finish")).toBeInTheDocument();
    });
    expect(posted).toBe(true);
  });

  it("keeps article hero on the hero image role and thumbs off 1600", async () => {
    const bbcThumb =
      "https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/live/title-race.jpg";
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "test-csrf" });
      if (url.includes("/comments")) return jsonResponse({ count: 0, comments: [] });
      if (url.includes("/articles/hero-role/related")) {
        return jsonResponse([
          { ...sampleArticle, id: 8, slug: "related-thumb", image_url: bbcThumb },
        ]);
      }
      if (url.includes("/articles/hero-role")) {
        return jsonResponse({
          ...sampleArticle,
          slug: "hero-role",
          image_url: bbcThumb,
          media: [{ url: bbcThumb, is_hero: true }],
          blocks: [{ type: "paragraph", text: "Aston Villa scored late." }],
        });
      }
      return jsonResponse([]);
    });
    renderAt("/article/hero-role");
    await waitFor(() => {
      expect(document.querySelector(".article-hero img")).toBeTruthy();
    });
    expect(document.querySelector(".article-hero img")?.getAttribute("src")).toContain("/1600/");
    expect(document.querySelector(".article-hero img")?.getAttribute("src")).not.toContain("/240/");
    const related = document.querySelector(".article-related-grid img");
    if (related) {
      expect(related.getAttribute("src")).not.toContain("/1600/");
    }
  });

  it("uses localized mobile chrome instead of hardcoded English on Serbian", async () => {
    window.localStorage.setItem("ninkosports.lang", "sr");
    renderAt("/");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Još" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Meni" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
  });
});

describe("Sports Data V1 predictions foundation", () => {
  beforeEach(() => {
    mockFetch();
    window.localStorage.clear();
  });

  it("renders Predictions with an honest empty state and no fake fixtures", async () => {
    renderAt("/predictions");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "NinkoSports Predictions" })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Predictions are being prepared/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Arsenal/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Liverpool/)).not.toBeInTheDocument();
    expect(screen.queryByText(/52%/)).not.toBeInTheDocument();
    expect(document.querySelector(".prediction-card")).toBeNull();
  });

  it("selects a sport, competition and period without crowding bottom nav", async () => {
    renderAt("/predictions");
    fireEvent.click(screen.getAllByRole("button", { name: "Football" })[0]);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "UEFA Champions League" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "UEFA Champions League" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "This Week" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("button", { name: "Today" }).className).toMatch(/is-active/);
    expect(screen.getByRole("button", { name: "This Week" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next 7 Days" })).toBeInTheDocument();
    expect(document.querySelector(".mobile-bottom-nav")?.textContent).toMatch(/Predictions/);
    expect(screen.getAllByRole("link", { name: "Predictions" }).length).toBeGreaterThan(0);
  });

  it("exposes Predictions in the drawer, not as a sport group", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const drawer = screen.getByRole("dialog", { name: "NinkoSports" });
    expect(drawer.textContent).toMatch(/Predictions/);
    const predictionLinks = [...drawer.querySelectorAll("a")].filter((node) =>
      node.getAttribute("href") === "/predictions"
    );
    expect(predictionLinks.length).toBeGreaterThan(0);
  });

  it("keeps Live Scores and article routes intact", async () => {
    renderAt("/live-scores");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Live Scores" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Finished" })).toBeInTheDocument();
    expect(screen.getByText(/No placeholder games are shown/i)).toBeInTheDocument();
    cleanup();
    renderAt("/article/villa-win");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Aston Villa win late" })).toBeInTheDocument();
    });
  });

  it("omits missing evidence sections on a prediction detail", async () => {
    const inner = global.fetch;
    global.fetch = vi.fn((input, init) => {
      const url = String(input);
      if (url.includes("/predictions/evt-real")) {
        return jsonResponse({
          connected: true,
          event: {
            id: "evt-real",
            sport: "football",
            competition: "UEFA Champions League",
            home: { name: "Home FC" },
            away: { name: "Away FC" },
            start_time: "2026-09-16T19:00:00Z",
            status: "scheduled",
          },
          prediction: {
            market: "1x2",
            home_win_pct: 50,
            draw_pct: 25,
            away_win_pct: 25,
            evidence: [
              { type: "recent_form", label: "Strong home form", facts: { wins: 4, matches: 5 } },
            ],
          },
          form: null,
          h2h: [],
          availability: [],
          standings: null,
          statistics: null,
        });
      }
      return inner(input, init);
    });
    renderAt("/predictions/football/champions-league/evt-real");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Home FC vs Away FC/ })).toBeInTheDocument();
    });
    expect(screen.getByText("Why this prediction?")).toBeInTheDocument();
    expect(screen.getByText("Strong home form")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Head to head" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Standings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Availability" })).not.toBeInTheDocument();
  });

  it("does not hardcode fake production predictions", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = dirname(fileURLToPath(import.meta.url));
    const files = [
      "pages/PredictionsPage.jsx",
      "pages/PredictionDetailPage.jsx",
      "pages/LiveScoresPage.jsx",
      "components/predictions/PredictionCard.jsx",
      "lib/sportsData.js",
    ];
    const forbidden = ["Arsenal", "Liverpool", "52%", "Inter"];
    for (const file of files) {
      const text = readFileSync(resolve(root, file), "utf8");
      for (const needle of forbidden) {
        expect(text).not.toContain(needle);
      }
    }
  });

  it("keeps Predictions labels translated in Serbian", async () => {
    window.localStorage.setItem("ninkosports.lang", "sr");
    renderAt("/predictions");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "NinkoSports predikcije" })).toBeInTheDocument();
    });
    expect(screen.getAllByRole("link", { name: "Predikcije" }).length).toBeGreaterThan(0);
  });
});

describe("Production quality surfaces", () => {
  beforeEach(() => {
    mockFetch();
    window.localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("keeps Predictions visible in the desktop header nav config", () => {
    renderAt("/");
    const desktop = document.querySelector(".desktop-nav");
    expect(desktop).toBeTruthy();
    expect(desktop.textContent).toMatch(/Predictions/);
    const predictions = desktop.querySelector('a[href="/predictions"]');
    expect(predictions).toBeTruthy();
    expect(predictions.className).toMatch(/nav-predictions/);
  });

  it("exposes Predictions Tennis Motorsport and Other Sports on the bottom nav rail", () => {
    renderAt("/");
    const bar = document.querySelector(".mobile-bottom-nav");
    expect(bar.textContent).toMatch(/Predictions/);
    expect(bar.textContent).toMatch(/Tennis/);
    expect(bar.textContent).toMatch(/Motorsport/);
    expect(bar.textContent).toMatch(/Other Sports/);
    expect(bar.querySelector(".bottom-nav-item.is-active, .bottom-nav-item.active")).toBeTruthy();
  });

  it("scrolls the active bottom-nav item into view", () => {
    renderAt("/tennis");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("lets More still open the vertically scrollable drawer", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const drawer = screen.getByRole("dialog", { name: "NinkoSports" });
    expect(drawer.querySelector(".mobile-drawer-scroll")).toBeTruthy();
    expect(drawer.textContent).toMatch(/My Sports/);
    expect(drawer.textContent).toMatch(/Predictions/);
  });

  it("renders the Other Sports directory without pretending coverage exists", async () => {
    renderAt("/other-sports");
    await waitFor(() => {
      expect(document.querySelector(".other-directory-grid")).toBeTruthy();
    });
    expect(screen.getAllByText("Golf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Horse Racing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Team Sports").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No stories yet").length).toBeGreaterThan(0);
  });

  it("opens a registry-driven sport route without inventing stories", async () => {
    renderAt("/sports/horse-racing");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Horse Racing" })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Arsenal 1-0/i)).not.toBeInTheDocument();
  });

  it("follows and unfollows a sport and keeps the state after reload", async () => {
    renderAt("/my-sports");
    const football = screen.getAllByRole("button", { name: /Football/i })[0];
    fireEvent.click(football);
    expect(JSON.parse(window.localStorage.getItem("ninkosports.favorites.v1")).sports).toContain(
      "football"
    );
    const following = screen.getAllByRole("button", { name: /Football/i }).find((node) =>
      node.className.includes("is-on")
    );
    expect(following).toBeTruthy();
    fireEvent.click(following);
    expect(JSON.parse(window.localStorage.getItem("ninkosports.favorites.v1")).sports).not.toContain(
      "football"
    );
    cleanup();
    renderAt("/my-sports");
    const restored = JSON.parse(window.localStorage.getItem("ninkosports.favorites.v1"));
    expect(restored.sports).not.toContain("football");
  });

  it("does not resurrect unfollowed sports from local storage when the account is empty", async () => {
    window.localStorage.setItem(
      "ninkosports.favorites.v1",
      JSON.stringify({ sports: ["tennis", "football"], leagues: [], teams: [] })
    );
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/providers")) {
        return jsonResponse({ password: true, google: false, facebook: false });
      }
      if (url.includes("/auth/session") || url.includes("/auth/csrf")) {
        return jsonResponse({
          user: { id: 4, display_name: "Pat", preferred_language: "en" },
          csrf: "test-csrf",
        });
      }
      if (url.includes("/auth/favorites")) {
        return jsonResponse({ sports: [], leagues: [], teams: [] });
      }
      if (url.includes("/auth/saved")) return jsonResponse([]);
      if (url.includes("/portal/home")) {
        return jsonResponse({ featured: [], latest: [], breaking: [], most_read: [], by_sport: {} });
      }
      if (url.includes("/meta/taxonomy")) {
        return jsonResponse({ sports: [], competitions: [] });
      }
      return jsonResponse([]);
    });
    renderAt("/my-sports");
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("ninkosports.favorites.v1"));
      expect(stored.sports).toEqual([]);
    });
    expect(screen.queryByText("Currently following")).not.toBeInTheDocument();
  });
});



