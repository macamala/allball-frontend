import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ArticleCard from "./ArticleCard.jsx";

const state = vi.hoisted(() => ({ lang: "sr", read: vi.fn() }));
vi.mock("../api.js", () => ({ getArticleTranslation: state.read }));
vi.mock("../context/I18nContext.jsx", () => ({ useI18n: () => ({ lang: state.lang, t: (k) => k, dateLocale: "en" }) }));
vi.mock("./ArticleImage.jsx", () => ({ default: () => null }));
vi.mock("./ArticleLink.jsx", () => ({ default: ({ children }) => <a>{children}</a> }));
const article = { slug: "example", title: "English headline", summary: "English summary", sport: "football" };
beforeEach(() => { state.lang = "sr"; state.read.mockReset(); });
afterEach(cleanup);

it("uses cached Serbian copy on a news card and restores English on language change", async () => {
  state.read.mockResolvedValue({ available: true, language: "sr", title: "Srpski naslov", summary: "Srpski sažetak" });
  const view = render(<ArticleCard article={article} />);
  await screen.findByText("Srpski naslov");
  expect(screen.getByText("Srpski sažetak")).toBeTruthy();
  state.lang = "en";
  view.rerender(<ArticleCard article={article} />);
  expect(screen.getByText("English headline")).toBeTruthy();
  expect(screen.queryByText("Srpski naslov")).toBeNull();
  expect(state.read).toHaveBeenCalledTimes(1);
});

it("keeps the real English headline when no translated copy exists", async () => {
  state.read.mockResolvedValue({ available: false });
  render(<ArticleCard article={article} />);
  expect(await screen.findByText("English headline")).toBeTruthy();
});
