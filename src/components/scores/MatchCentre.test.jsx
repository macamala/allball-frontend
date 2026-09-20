import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../context/I18nContext.jsx";
import { AuthProvider } from "../../context/AuthContext.jsx";
import MatchCentre from "./MatchCentre.jsx";

function jsonResponse(data) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

function wrap(ui) {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </I18nProvider>
  );
}

beforeEach(() => {
  global.fetch = vi.fn((input) => {
    const url = String(input);
    if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "t" });
    return jsonResponse({});
  });
});

describe("Match Centre layouts", () => {
  it("keeps sparse events in natural document flow", () => {
    wrap(
      <MatchCentre
        event={{
          id: "sparse",
          sport: "football",
          competition: "Ligue 1",
          home: { name: "Monaco" },
          away: { name: "Lens" },
          status: "scheduled",
          start_time: "2026-09-20T18:00:00Z",
          start_precision: "EXACT_TIME",
          score: { home: null, away: null },
          venue: "Stade Louis II",
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText("Monaco")).toBeTruthy();
    expect(screen.getByText("Lens")).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("Stade Louis II")).toBeTruthy();
    expect(screen.queryByText("Ligue 1", { selector: "dd" })).toBeNull();
    expect(screen.queryByText("Lineups")).toBeNull();
  });

  it("renders rich football sections only when data exists", () => {
    wrap(
      <MatchCentre
        event={{
          id: "rich",
          sport: "football",
          competition: "Premier League",
          home: { name: "Arsenal" },
          away: { name: "Chelsea" },
          status: "finished",
          score: { home: 2, away: 1 },
          incidents: [{ minute: 12, player: "Saka", type: "goal", score_after: { home: 1, away: 0 } }],
          statistics: [{ label: "Possession", home: 58, away: 42 }],
          lineups: [{ name: "Raya" }],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText("2 – 1")).toBeTruthy();
    expect(screen.getByText(/Saka/)).toBeTruthy();
    expect(screen.getByText(/Possession/)).toBeTruthy();
    expect(screen.getByText("Raya")).toBeTruthy();
    expect(screen.queryByText("Odds")).toBeNull();
  });

  it("renders tennis set tables", () => {
    wrap(
      <MatchCentre
        event={{
          id: "ten",
          sport: "tennis",
          event_family: "individual_match",
          competition: "WTA",
          home: { name: "Swiatek" },
          away: { name: "Gauff" },
          status: "finished",
          score: { home: 2, away: 0 },
          periods: [
            { home: 6, away: 4, label: "Set 1" },
            { home: 6, away: 3, label: "Set 2" },
          ],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText("Set 1")).toBeTruthy();
    expect(screen.getAllByText("Swiatek").length).toBeGreaterThan(0);
  });

  it("renders basketball, baseball, hockey, cricket, motorsport, golf, racing and esports only with real fields", () => {
    wrap(
      <MatchCentre
        event={{
          id: "bb",
          sport: "basketball",
          home: { name: "Celtics" },
          away: { name: "Nets" },
          status: "live",
          live_class: "CONFIRMED_LIVE",
          score: { home: 88, away: 81 },
          periods: [
            { label: "Q1", home: 22, away: 19 },
            { label: "Q2", home: 20, away: 21 },
          ],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText("Q1")).toBeTruthy();

    wrap(
      <MatchCentre
        event={{
          id: "mlb",
          sport: "baseball",
          home: { name: "Yankees" },
          away: { name: "Red Sox" },
          status: "live",
          live_class: "CONFIRMED_LIVE",
          score: { home: 3, away: 2, hits: { home: 7, away: 5 } },
          periods: [{ label: "1", home: 1, away: 0 }],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText(/Hits/)).toBeTruthy();

    wrap(
      <MatchCentre
        event={{
          id: "nhl",
          sport: "ice-hockey",
          home: { name: "Bruins" },
          away: { name: "Leafs" },
          status: "finished",
          score: { home: 4, away: 1 },
          periods: [{ label: "P1", home: 1, away: 0 }],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText("P1")).toBeTruthy();

    wrap(
      <MatchCentre
        event={{
          id: "ck",
          sport: "cricket",
          home: { name: "India" },
          away: { name: "Australia" },
          status: "live",
          live_class: "CONFIRMED_LIVE",
          score: { runs: 210, wickets: 3, overs: 32.1 },
        }}
        data={{}}
        standings={[]}
      />
    );

    wrap(
      <MatchCentre
        event={{
          id: "f1",
          sport: "motorsport",
          event_family: "motorsport_race",
          competition: "Formula 1",
          session_type: "Race",
          classification: [{ position: 1, name: "Norris" }],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText(/Norris/).length).toBeGreaterThan(0);

    wrap(
      <MatchCentre
        event={{
          id: "golf",
          sport: "golf",
          event_family: "tournament",
          leaderboard: [{ position: 1, name: "Scheffler", total: "-12" }],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText(/Scheffler/).length).toBeGreaterThan(0);

    wrap(
      <MatchCentre
        event={{
          id: "race",
          sport: "horse-racing",
          event_family: "racing",
          live_class: "RAPID_RESULT",
          status: "finished",
          race_name: "Ascot 2:10",
          winner: "Night Rider",
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText(/Night Rider/).length).toBeGreaterThan(0);

    wrap(
      <MatchCentre
        event={{
          id: "es",
          sport: "league-of-legends",
          parent_sport_id: "esports",
          home: { name: "T1" },
          away: { name: "GEN" },
          best_of: 5,
          maps: [{ name: "Game 1", home: 1, away: 0 }],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText(/Game 1/).length).toBeGreaterThan(0);
  });
});
