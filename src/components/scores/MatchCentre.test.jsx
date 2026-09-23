import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(screen.getAllByText("Timeline").length).toBeGreaterThan(0);
    expect(screen.queryByText("Odds")).toBeNull();
  });

  it("renders a real football formation pitch and interactive tabs", () => {
    const starters = (prefix) =>
      Array.from({ length: 11 }, (_, index) => ({
        id: `${prefix}-${index + 1}`,
        name: `${prefix} Player ${index + 1}`,
        number: index + 1,
        image: index === 0 ? `https://images.example.com/${prefix}-keeper.png` : undefined,
      }));
    wrap(
      <MatchCentre
        event={{
          id: "pitch-rich",
          sport: "football",
          competition: "Premier League",
          home: { name: "Arsenal" },
          away: { name: "Chelsea" },
          status: "finished",
          score: { home: 2, away: 1 },
          statistics: [
            { label: "Possession", home: "58%", away: "42%" },
            { label: "Shots on target", home: 7, away: 4 },
          ],
          lineups: {
            confirmed: true,
            home: { formation: "4-3-3", coach: "Home Coach", start: starters("Home"), bench: [] },
            away: { formation: "4-2-3-1", coach: "Away Coach", start: starters("Away"), bench: [] },
          },
        }}
        data={{}}
        standings={[]}
      />
    );

    const lineupTab = screen.getByRole("tab", { name: /lineups/i });
    fireEvent.click(lineupTab);
    expect(lineupTab.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector(".mc-pitch")).toBeTruthy();
    expect(document.querySelector(".mc-pitch-team.is-home")).toBeTruthy();
    expect(document.querySelector(".mc-pitch-team.is-away")).toBeTruthy();
    expect(document.querySelector(".mc-player-avatar img")).toBeTruthy();
    expect(screen.getByText("4-3-3")).toBeTruthy();
    expect(screen.getByText("4-2-3-1")).toBeTruthy();

    const statsTab = screen.getByRole("tab", { name: /statistics/i });
    fireEvent.click(statsTab);
    expect(statsTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("58%")).toBeTruthy();
    expect(document.querySelectorAll(".mc-stat-track").length).toBeGreaterThan(0);
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
    expect(screen.getAllByText("Sets").length).toBeGreaterThan(0);
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

    wrap(
      <MatchCentre
        event={{
          id: "fb-stats",
          sport: "football",
          home: { name: "Roma" },
          away: { name: "Lazio" },
          player_statistics: [{ name: "De Bruyne", rating: 8.1, goals: 1, assists: 1 }],
          statistics: [{ label: "Expected goals (xG)", home: 1.5, away: 1.4 }],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText(/De Bruyne/)).toBeTruthy();
    expect(screen.getByText(/Expected goals/)).toBeTruthy();
  });

  it("renders AFL goals and behinds from sport detail", () => {
    wrap(
      <MatchCentre
        event={{
          id: "afl-1",
          sport: "australian-rules",
          home: { name: "Sydney Swans" },
          away: { name: "Fremantle" },
          score: { home: 71, away: 83 },
          venue: "Sydney Cricket Ground",
          sport_detail: {
            goals: { home: 10, away: 12 },
            behinds: { home: 11, away: 11 },
            score: { home: 71, away: 83 },
          },
          periods: [
            { label: "G", home: 10, away: 12 },
            { label: "B", home: 11, away: 11 },
          ],
        }}
        data={{}}
        standings={[
          { position: 1, team: "Fremantle", played: 23, wins: 19, losses: 4, percentage: 137.2, points: 76 },
        ]}
      />
    );
    expect(screen.getByText("10 – 12")).toBeTruthy();
    expect(screen.getByText("11 – 11")).toBeTruthy();
    expect(screen.getAllByText("Goals")).toHaveLength(1);
    expect(screen.getAllByText("Behinds")).toHaveLength(1);
    expect(screen.queryByText("Goals / behinds")).toBeNull();
    expect(screen.getAllByText("Fremantle").length).toBeGreaterThan(0);
    expect(screen.getByText("%")).toBeTruthy();
  });

  it("renders a table-tennis meeting as rubbers, including doubles", () => {
    wrap(
      <MatchCentre
        event={{
          id: "tt",
          sport: "table-tennis",
          home: { name: "Saarbrücken" },
          away: { name: "Mühlhausen" },
          status: "finished",
          score: { home: 3, away: 1 },
          periods: [{ label: "Rubber 1", home: 3, away: 1 }],
          sport_detail: {
            meeting: true,
            rubbers: [
              {
                home: 3,
                away: 1,
                home_player: "Bastian Steger",
                away_player: "Tom Jarvis",
                games: [
                  { home: 2, away: 11 },
                  { home: 11, away: 2 },
                  { home: 12, away: 10 },
                  { home: 11, away: 9 },
                ],
              },
              {
                home: 3,
                away: 2,
                home_players: ["Anna One", "Bea Two"],
                away_players: ["Cara Three", "Dora Four"],
                games: [{ home: 11, away: 8 }],
              },
            ],
          },
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText("3 – 1").length).toBeGreaterThan(0);
    expect(screen.getByText(/Bastian Steger/)).toBeTruthy();
    expect(screen.getByText(/Tom Jarvis/)).toBeTruthy();
    expect(screen.getByText("2 – 11")).toBeTruthy();
    expect(screen.getByText("11 – 9")).toBeTruthy();
    expect(screen.getByText(/Anna One \/ Bea Two/)).toBeTruthy();
    expect(screen.getByText(/Cara Three \/ Dora Four/)).toBeTruthy();
    expect(screen.getAllByText("Rubbers").length).toBeGreaterThan(0);
    expect(screen.queryByText("Rubber 1")).toBeNull();
  });

  it("renders volleyball sets beside the match score", () => {
    wrap(
      <MatchCentre
        event={{
          id: "vb",
          sport: "volleyball",
          home: { name: "Zawiercie" },
          away: { name: "Lublin" },
          status: "finished",
          score: { home: 3, away: 0 },
          periods: [
            { label: "Set 1", home: 25, away: 19 },
            { label: "Set 2", home: 25, away: 21 },
            { label: "Set 3", home: 25, away: 14 },
          ],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText("3 – 0")).toBeTruthy();
    expect(screen.getByText("Set 1")).toBeTruthy();
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
    expect(screen.getByText("14")).toBeTruthy();
    expect(screen.getAllByText("Sets").length).toBeGreaterThan(0);
  });

  it("renders cricket innings and the match result", () => {
    wrap(
      <MatchCentre
        event={{
          id: "t20",
          sport: "cricket",
          home: { name: "St Lucia Kings" },
          away: { name: "Guyana Amazon Warriors" },
          status: "finished",
          score: { home: 119, away: 122 },
          innings: [
            { label: "St Lucia Kings", runs: 119, wickets: 10, overs: 19 },
            { label: "Guyana Amazon Warriors", runs: 122, wickets: 6, overs: 19, target: 120 },
          ],
          sport_detail: { result: "Guyana Amazon Warriors won", win_by: { wickets: 4 } },
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getByText("119/10 (19 overs)")).toBeTruthy();
    expect(screen.getByText("122/6 (19 overs)")).toBeTruthy();
    expect(screen.getByText("Target 120")).toBeTruthy();
    expect(screen.getByText("Guyana Amazon Warriors won by 4 wickets")).toBeTruthy();
    expect(screen.queryByText("Scorecard")).toBeNull();
  });

  it("renders a motorsport classification with the fields the payload actually has", () => {
    wrap(
      <MatchCentre
        event={{
          id: "gp",
          sport: "motorsport",
          event_family: "motorsport_race",
          home: { name: "Australian Grand Prix" },
          status: "finished",
          classification: [
            { position: "1", name: "George Russell", grid: "1", gap: "1:23:06.801", status: "Finished", fastest_lap: "1:22.670", points: "25" },
          ],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText("George Russell").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Pos",
      "Name",
      "Grid",
      "Time / gap",
      "Status",
      "Fastest lap",
      "Pts",
    ]);
    expect(screen.getByText("1:22.670")).toBeTruthy();
  });

  it("renders Euroleague quarters and rugby scoring only when those fields exist", () => {
    wrap(
      <MatchCentre
        event={{
          id: "el",
          sport: "basketball",
          home: { name: "Olympiacos" },
          away: { name: "Madrid" },
          status: "finished",
          score: { home: 92, away: 85 },
          periods: [{ label: "1", home: 31, away: 19 }],
          player_statistics: [{ name: "WALKUP, THOMAS", points: 3, rebounds: 3, assists: 3, side: "home" }],
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText("Quarters").length).toBeGreaterThan(0);
    expect(screen.getByText("WALKUP, THOMAS")).toBeTruthy();
    expect(screen.getByText("PTS")).toBeTruthy();

    wrap(
      <MatchCentre
        event={{
          id: "rugby",
          sport: "rugby",
          home: { name: "Northampton Saints" },
          away: { name: "Exeter Chiefs" },
          status: "finished",
          score: { home: 26, away: 17 },
          sport_detail: { tries: { home: 4, away: 3 }, conversions: { home: 3, away: 1 }, penalties: { home: null, away: null } },
          statistics: [{ label: "Possession", home: 58, away: 42 }],
          lineups: { home: { start: [{ name: "Danilo Fischetti" }] }, away: { start: [{ name: "Joe Simmonds" }] } },
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText("tries").length).toBeGreaterThan(0);
    expect(screen.queryByText("penalties")).toBeNull();
    expect(screen.getByText("Danilo Fischetti")).toBeTruthy();
    expect(screen.getByText(/Possession/)).toBeTruthy();
    expect(screen.queryByText("Games")).toBeNull();
  });

  it("shows a LoL series as individual games", () => {
    wrap(
      <MatchCentre
        event={{
          id: "lol",
          sport: "esports-lol",
          home: { name: "T1" },
          away: { name: "KT Rolster" },
          status: "finished",
          score: { home: 3, away: 2 },
          sport_detail: {
            best_of: 5,
            series_id: "113475871524050783",
            games: [
              {
                id: "113475871524050784",
                name: 1,
                blue: { name: "KT Rolster", side: "blue", kills: 11 },
                red: { name: "T1", side: "red", kills: 25 },
                duration: 3120,
              },
            ],
          },
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText("Games").length).toBeGreaterThan(0);
    expect(screen.getByText((_, node) => node?.tagName === "P" && /Best of\s*5/.test(node.textContent || ""))).toBeTruthy();
    expect(screen.getByText(/blue KT Rolster 11/)).toBeTruthy();
    expect(screen.getByText(/red T1 25/)).toBeTruthy();
    expect(screen.getByText(/52:00/)).toBeTruthy();
  });

  it("shows shot detail only when shots exist", () => {
    wrap(
      <MatchCentre
        event={{
          id: "liiga-1",
          sport: "ice-hockey",
          competition: "finland-liiga",
          status: "finished",
          home: { name: "HPK" },
          away: { name: "TPS" },
          score: { home: 2, away: 3 },
          sport_detail: { shots: [{ period: 1, player: "Vili Alitalo", type: "shot", x: 10, y: 4 }] },
        }}
        data={{}}
        standings={[]}
      />
    );
    expect(screen.getAllByText("Shots").length).toBeGreaterThan(0);
    expect(screen.getByText(/Vili Alitalo/)).toBeTruthy();
  });
});
