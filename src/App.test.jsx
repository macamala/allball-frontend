import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach, vi } from "vitest";
import App from "./App.jsx";
import ArticleImage from "./components/ArticleImage.jsx";

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
      return jsonResponse([sampleArticle]);
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
});
