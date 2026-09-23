import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../context/I18nContext.jsx";
import { AuthProvider } from "../../context/AuthContext.jsx";
import EventList from "./EventList.jsx";
import EventRow from "./EventRow.jsx";
import { normalizeEvent } from "../../lib/sportsData.js";
import { collapseDisplayEvents } from "../../lib/scoreIdentity.js";

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
  competition_key: "england-premier-league",
  geography_label: "England",
  scope_type: "DOMESTIC",
  country_id: "england",
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
  it("renders a compact football live row and links directly to the canonical Match Centre route", () => {
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
    const link = screen.getByRole("link", { name: /67’ Arsenal 2 Chelsea 1/i });
    expect(link.getAttribute("href")).toBe("/scores/event/fb-live");
    expect(document.body.textContent).not.toMatch(/source_family/i);
  });

  it("renders 0-0 and keeps a missing score as a dash", () => {
    const finished = normalizeEvent({
      id: "zero",
      sport: "football",
      competition: "Premier League",
      home: { name: "Everton" },
      away: { name: "Fulham" },
      status: "finished",
      score: { home: 0, away: 0 },
    });
    const upcoming = normalizeEvent({
      id: "nulls",
      sport: "football",
      competition: "Premier League",
      home: { name: "Brentford" },
      away: { name: "Wolves" },
      status: "scheduled",
      score: { home: null, away: null },
      start_time: "2026-09-20T19:00:00Z",
    });
    wrap(
      <ul>
        <EventRow event={finished} />
        <EventRow event={upcoming} />
      </ul>
    );
    expect(screen.getAllByText("0").length).toBeGreaterThan(1);
    expect(screen.getAllByText("–").length).toBeGreaterThan(1);
  });

  it("renders one row when alias names represent the same fixture", () => {
    const shortName = normalizeEvent({
      id: "m1",
      sport: "football",
      competition_key: "ligue-1",
      competition: "Ligue 1",
      home: { name: "Monaco" },
      away: { name: "Lens" },
      status: "finished",
      score: { home: 2, away: 1 },
      start_time: "2026-09-20T18:00:00Z",
    });
    const longName = normalizeEvent({
      id: "m2",
      sport: "football",
      competition_key: "ligue-1",
      competition: "Ligue 1",
      home: { name: "AS Monaco FC" },
      away: { name: "Racing Club de Lens" },
      status: "scheduled",
      score: { home: null, away: null },
      start_time: "2026-09-20T18:00:00Z",
    });
    wrap(<EventList events={collapseDisplayEvents([shortName, longName])} />);
    expect(screen.getAllByText("Monaco").length).toBe(1);
    expect(screen.queryByText("AS Monaco FC")).toBeNull();
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
    expect(screen.getByText("England")).toBeInTheDocument();
    expect(screen.getByText("Set 3")).toBeInTheDocument();
    expect(document.querySelector(".score-pair-stack .score-sets")).toBeTruthy();
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
