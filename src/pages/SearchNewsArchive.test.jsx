import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../context/I18nContext.jsx";
import SearchPage from "./SearchPage.jsx";

const api = vi.hoisted(() => ({ getMeta: vi.fn(), searchArticles: vi.fn() }));
vi.mock("../api.js", () => api);
afterEach(cleanup);

it("searches the scoped archive and renders older originals without restoring imported liveblogs", async () => {
  const original = { id: 1, title: "Previous verified football report", slug: "previous-report",
    published_at: "2026-09-01T12:00:00Z", sport: "football", ai_generated: true,
    quality_ok: true, sport_match_ok: true, image_url: "https://example.test/photo.jpg",
    hero_media_kind: "EDITORIAL_PHOTO" };
  api.getMeta.mockResolvedValue({ sports: ["football"], leagues: [] });
  api.searchArticles.mockResolvedValue([original,
    { ...original, id: 2, slug: "imported", title: "Imported liveblog", ai_generated: false }]);
  render(<I18nProvider><MemoryRouter initialEntries={["/search?q=football&sport=football"]}>
    <SearchPage />
  </MemoryRouter></I18nProvider>);
  await screen.findByText(original.title);
  expect(screen.queryByText("Imported liveblog")).toBeNull();
  expect(api.searchArticles).toHaveBeenCalledWith("football", {sport: "football", league: "", limit: 50});
});
