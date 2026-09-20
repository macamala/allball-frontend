import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../context/I18nContext.jsx";
import MatchCentre from "./MatchCentre.jsx";

function wrap(ui) {
  return render(
    <I18nProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nProvider>
  );
}

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
          incidents: [{ minute: 12, player: "Saka", type: "goal" }],
          statistics: [{ label: "Possession", value: "58%" }],
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
    expect(screen.queryByRole("tab")).toBeNull();
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
});
