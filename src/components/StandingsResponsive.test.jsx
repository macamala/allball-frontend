import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import StandingsTable from "./StandingsTable.jsx";

const rows = [
  { position: 1, team: "Greece", team_id: "gre", group: "A2", played: 1, wins: 1, draws: 0, losses: 0, goals_for: 2, goals_against: 1, goal_difference: 1, points: 3, logo: "/flag-gr.svg" },
  { position: 4, team: "Serbia", team_id: "srb", group: "A2", played: 1, wins: 0, draws: 0, losses: 1, goals_for: 1, goals_against: 2, goal_difference: -1, points: 0, logo: "/flag-rs.svg" },
  { position: 1, team: "Austria", team_id: "aut", group: "B3", played: 1, wins: 1, draws: 0, losses: 0, goals_for: 3, goals_against: 1, goal_difference: 2, points: 3, logo: "/flag-at.svg" },
];
const event = { id: "serbia", group: "A2" };
const wrap = (props = {}) => render(<MemoryRouter><StandingsTable rows={rows} event={event} competition="uefa-nations-league" {...props} /></MemoryRouter>);

describe("Responsive standings", () => {
  it("keeps points and goal difference in the compact summary without dropping full statistics", () => {
    const { container } = wrap();
    for (const key of ["position", "team", "played", "goal_difference", "points"])
      expect(container.querySelector(`th[data-column="${key}"]`).classList.contains("is-summary")).toBe(true);
    for (const key of ["wins", "draws", "losses", "goals_for", "goals_against"])
      expect(container.querySelector(`th[data-column="${key}"]`).classList.contains("is-detail")).toBe(true);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(container.querySelectorAll("tbody td[data-column=points]")[1].textContent).toBe("0");
    expect(container.querySelectorAll("tbody img")).toHaveLength(2);
    expect(screen.queryByText("Austria")).toBeNull();
  });
  it("opens the full table, retains group selection, and restores the horizontal position", () => {
    const { container } = wrap();
    const region = screen.getByRole("region", { name: "Standings table" });
    const button = screen.getByRole("button", { name: "Full table" });
    expect(button.getAttribute("aria-controls")).toBe(region.id);
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Compact table" }).getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".standings-responsive").classList.contains("is-expanded")).toBe(true);
    expect(screen.getByRole("combobox").value).toBe(JSON.stringify(["", "A2"]));
    region.scrollLeft = 250;
    fireEvent.click(screen.getByRole("button", { name: "Compact table" }));
    expect(region.scrollLeft).toBe(0);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: JSON.stringify(["", "B3"]) } });
    expect(screen.getByText("Austria")).toBeTruthy();
    expect(screen.queryByText("Serbia")).toBeNull();
  });
  it("does not invent football columns for basketball", () => {
    const { container } = wrap({ sport: "basketball", event: {}, rows: [{ position: 1, team: "Test team", played: 4, wins: 3, losses: 1, pct: 0.75 }] });
    expect(container.querySelector('th[data-column="goals_for"]')).toBeNull();
    expect(container.querySelector('th[data-column="pct"]').classList.contains("is-summary")).toBe(true);
    expect(screen.queryByRole("button", { name: "Full table" })).toBeNull();
  });
  it("does not render an empty standings table", () => {
    const { container } = wrap({ rows: [] });
    expect(container.querySelector("table")).toBeNull();
  });
});
