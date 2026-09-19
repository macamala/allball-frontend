import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../context/I18nContext.jsx";
import MatchPage from "./MatchPage.jsx";
import { clearPublicCache } from "../api.js";

function jsonResponse(data, status = 200) {
  const body = JSON.stringify(data);
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => body,
  });
}

function matchPayload(id, home, away, score = { home: 2, away: 0 }, extra = {}) {
  const event = {
    id,
    sport: extra.sport || "tennis",
    competition: extra.competition || "wta-tour",
    competition_key: extra.competition || "wta-tour",
    event_family: extra.event_family || "individual_match",
    home: { name: home },
    away: { name: away },
    status: "finished",
    score,
    periods: extra.periods || [
      { home: 6, away: 4, label: "Set 1" },
      { home: 6, away: 4, label: "Set 2" },
    ],
  };
  return { connected: true, id, event, header: event };
}

const A = "ninko-evt-dbl-a";
const B = "ninko-evt-dbl-b";
const C = "ninko-evt-fb-c";

function renderMatch(path) {
  let navigate;
  function CaptureNavigate() {
    navigate = useNavigate();
    return <MatchPage />;
  }
  const view = render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/scores/event/:matchId" element={<CaptureNavigate />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );
  return {
    navigate: (next) => navigate(next),
    ...view,
  };
}

describe("Match Centre event isolation", () => {
  beforeEach(() => {
    clearPublicCache();
  });

  it("does not keep event A hero under event B url while loading", async () => {
    let releaseB;
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "x" });
      if (url.includes(`/sports-data/matches/${A}`)) {
        return jsonResponse(matchPayload(A, "Gabriela Dabrowski / Luisa Stefani", "Kaitlin Quevedo / Dominika Salkova"));
      }
      if (url.includes(`/sports-data/matches/${B}`)) {
        return new Promise((resolve) => {
          releaseB = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => matchPayload(B, "Cristina Bucsa / Nicole Melichar-Martinez", "Caroline Dolehide / Irina Khromacheva"),
              text: async () =>
                JSON.stringify(
                  matchPayload(B, "Cristina Bucsa / Nicole Melichar-Martinez", "Caroline Dolehide / Irina Khromacheva")
                ),
            });
        });
      }
      return jsonResponse({});
    });
    const { navigate } = renderMatch(`/scores/event/${A}`);
    await waitFor(() => {
      expect(screen.getAllByText(/Gabriela Dabrowski/).length).toBeGreaterThan(0);
    });
    await act(async () => {
      await navigate(`/scores/event/${B}`);
    });
    expect(screen.queryByText(/Gabriela Dabrowski/)).toBeNull();
    expect(document.querySelector(".page-match")).toBeTruthy();
    releaseB();
    await waitFor(() => {
      expect(screen.getAllByText(/Cristina Bucsa/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Gabriela Dabrowski/)).toBeNull();
  });

  it("ignores a late response for A after navigating A → B → C → A → B", async () => {
    const releases = {};
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes("/auth/")) return jsonResponse({ user: null, csrf: "x" });
      const specs = {
        [A]: matchPayload(A, "Pair A Home / A2", "Pair A Away / A3"),
        [B]: matchPayload(B, "Pair B Home / B2", "Pair B Away / B3"),
        [C]: matchPayload(C, "Alpha FC", "Beta FC", { home: 1, away: 0 }, { sport: "football", competition: "bl1", event_family: "team_match", periods: [] }),
      };
      for (const [id, payload] of Object.entries(specs)) {
        if (url.includes(`/sports-data/matches/${id}`)) {
          return new Promise((resolve) => {
            const list = releases[id] || (releases[id] = []);
            list.push(() =>
              resolve({
                ok: true,
                status: 200,
                json: async () => payload,
                text: async () => JSON.stringify(payload),
              })
            );
          });
        }
      }
      return jsonResponse({});
    });
    const { navigate } = renderMatch(`/scores/event/${A}`);
    await act(async () => {
      await navigate(`/scores/event/${B}`);
    });
    await act(async () => {
      await navigate(`/scores/event/${C}`);
    });
    await act(async () => {
      await navigate(`/scores/event/${A}`);
    });
    await act(async () => {
      await navigate(`/scores/event/${B}`);
    });
    expect(releases[A]?.length).toBeGreaterThan(0);
    releases[A].forEach((fn) => fn());
    await act(async () => {});
    expect(screen.queryByText(/Pair A Home/)).toBeNull();
    releases[B].forEach((fn) => fn());
    await waitFor(() => {
      expect(screen.getAllByText(/Pair B Home/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Pair A Home/)).toBeNull();
    expect(screen.queryByText(/Alpha FC/)).toBeNull();
  });
});
