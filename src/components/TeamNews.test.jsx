import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../context/I18nContext.jsx";
import TeamNews from "./TeamNews.jsx";
const api = vi.hoisted(() => ({ getArticles: vi.fn(), searchArticles: vi.fn() }));
vi.mock("../api.js", () => api);
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
const profile = (name) => ({ available: true, sport: "football", entity_key: name, name, football_gender: "men", team: { name } });
const story = (name) => ({ id: name, slug: name, title: `${name} original report`, sport: "football", image_url: "https://example.test/photo.jpg",
  published_at: "2026-09-28T01:00:00Z", ai_generated: true, quality_ok: true, sport_match_ok: true, hero_media_kind: "EDITORIAL_PHOTO" });
const wrap = (name) => <I18nProvider><MemoryRouter><TeamNews profile={profile(name)} /></MemoryRouter></I18nProvider>;

it("shows yesterday's matching news, retains date and links to the sport archive", async () => {
  api.searchArticles.mockResolvedValue([story("Napoli"), { ...story("Napoli"), id: "copy", title: "Napoli source copy", ai_generated: false }]);
  api.getArticles.mockResolvedValue([]);
  render(wrap("Napoli"));
  expect(await screen.findByText("Napoli original report")).toBeTruthy();
  expect(screen.queryByText("Napoli source copy")).toBeNull();
  expect(screen.getByRole("link", { name: "Search news archive" }).getAttribute("href")).toBe("/search?q=napoli&sport=football");
  expect(document.querySelector("time").getAttribute("datetime")).toBe("2026-09-28T01:00:00Z");
});

it("does not show the previous team's delayed response after navigation", async () => {
  let resolveNapoli;
  api.searchArticles.mockImplementation((q) => q === "napoli" ? new Promise((resolve) => { resolveNapoli = resolve; }) : Promise.resolve([story("Arsenal")]));
  api.getArticles.mockResolvedValue([]);
  const view = render(wrap("Napoli"));
  view.rerender(wrap("Arsenal"));
  await screen.findByText("Arsenal original report");
  await act(async () => resolveNapoli([story("Napoli")]));
  expect(screen.queryByText("Napoli original report")).toBeNull();
  expect(screen.getByText("Arsenal original report")).toBeTruthy();
});

it("distinguishes a failed News read from an empty archive", async () => {
  api.searchArticles.mockRejectedValue(new Error("offline"));
  api.getArticles.mockRejectedValue(new Error("offline"));
  render(wrap("Napoli"));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Some news could not be loaded"));
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  expect(screen.queryByText("No verified news is linked to this team yet.")).toBeNull();
});
