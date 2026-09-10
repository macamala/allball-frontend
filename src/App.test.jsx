import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach, vi } from "vitest";
import App from "./App.jsx";
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
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

function mockFetch() {
  global.fetch = vi.fn((input, init = {}) => {
    const url = String(input);
    if (url.includes("/portal/home")) {
      return jsonResponse({
        featured: [sampleArticle],
        latest: [sampleArticle],
        breaking: [],
        most_read: [],
        by_sport: { football: [sampleArticle], basketball: [], tennis: [], motorsport: [] },
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
    if (url.includes("/meta/sports")) return jsonResponse(["football"]);
    if (url.includes("/meta/leagues")) return jsonResponse([]);
    if (url.includes("/sports-data/scores")) {
      return jsonResponse({ connected: false, matches: [], message: "not connected" });
    }
    if (url.includes("/sports-data/standings")) {
      return jsonResponse({ connected: false, rows: [] });
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
      expect(screen.getByLabelText("Latest news")).toBeInTheDocument();
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
});
