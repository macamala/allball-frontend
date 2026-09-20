import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../context/I18nContext.jsx";
import { AuthProvider } from "../../context/AuthContext.jsx";
import EventList from "./EventList.jsx";
import EventRow from "./EventRow.jsx";
import { normalizeEvent } from "../../lib/sportsData.js";

function jsonResponse(data) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

function wrap(node) {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <AuthProvider>{node}</AuthProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

const footballLive = normalizeEvent({
  id: "fb-live",
  sport: "football",
  competition: "Premier League",
  competition_key: "premier-league",
  event_family: "team_match",
  home: { name: "Arsenal", id: "ars" },
  away: { name: "Chelsea", id: "che" },
  status: "live",
  score: { home: 2, away: 1, minute: 67 },
  start_time: "2026-09-20T15:00:00Z",
});

beforeEach(() => {
  global.fetch = vi.fn((input) => {
    const url = String(input);
    if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "t" });
    if (url.includes("/sports-data/matches/")) {
      return jsonResponse({
        connected: true,
        event: {
          ...footballLive,
          venue: "Emirates Stadium",
          round: "Matchday 5",
        },
      });
    }
    return jsonResponse({});
  });
});

describe("Score Centre rows", () => {
  it("renders a compact football live row and expands quick detail without dumping provider ids", async () => {
    wrap(
      <ul>
        <EventRow event={footballLive} />
      </ul>
    );
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Chelsea")).toBeInTheDocument();
    expect(screen.getByText("67’")).toBeInTheDocument();
    expect(document.querySelector(".score-row.is-live")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Follow event/i }));
    expect(JSON.parse(window.localStorage.getItem("ninkosports.favorites.v1")).teams).toContain("ars");
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    await waitFor(() => {
      expect(screen.getByText(/Match Centre/)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /Match Centre/ }).getAttribute("href")).toBe(
      "/scores/event/fb-live"
    );
    expect(document.body.textContent).not.toMatch(/source_family/i);
  });

  it("collapses a competition group and keeps tennis set columns", () => {
    const tennis = normalizeEvent({
      id: "ten-1",
      sport: "tennis",
      competition: "ATP Tour",
      competition_key: "atp-tour",
      event_family: "individual_match",
      home: { name: "Player A" },
      away: { name: "Player B" },
      status: "live",
      score: { home: 1, away: 2, set: 3 },
      periods: [
        { home: 6, away: 4 },
        { home: 3, away: 6 },
        { home: 2, away: 4 },
      ],
    });
    wrap(<EventList events={[footballLive, tennis]} />);
    expect(screen.getByText("Set 3")).toBeInTheDocument();
    expect(document.querySelector(".score-period-grid")).toBeTruthy();
    fireEvent.click(screen.getByText("Premier League").closest("button"));
    expect(screen.queryByText("Arsenal")).toBeNull();
  });

  it("does not style a racing RAPID_RESULT row as live", () => {
    const race = normalizeEvent({
      id: "race-1",
      sport: "horse-racing",
      event_family: "racing",
      competition: "Ascot",
      status: "live",
      live_class: "RAPID_RESULT",
      race_name: "2:10 Ascot",
      winner: "Night Rider",
    });
    wrap(
      <ul>
        <EventRow event={race} />
      </ul>
    );
    expect(document.querySelector(".score-row.is-live")).toBeNull();
    expect(screen.getByText("2:10 Ascot")).toBeInTheDocument();
  });
});
