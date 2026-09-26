import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import ArticlePage from "./ArticlePage.jsx";

const api = vi.hoisted(() => ({
  getArticle: vi.fn(), getJSON: vi.fn(), getRelated: vi.fn(),
  peekArticle: vi.fn(), recordView: vi.fn(), setPageSeo: vi.fn(),
}));
vi.mock("../api.js", () => ({ ...api, articlePath: (slug) => `/articles/${encodeURIComponent(slug)}` }));
vi.mock("../context/I18nContext.jsx", () => {
  // The real provider memoizes its translator. A new function every render
  // would create an artificial effect loop in the unchanged baseline reader.
  const t = (key) => ({
    "empty.loadFail": "Could not load article", "empty.articleMissing": "Article not found",
    "empty.backHome": "Back home", "loading.article": "Loading article", "live.retry": "Retry",
  }[key] || key);
  return { useI18n: () => ({ t }) };
});
vi.mock("../lib/seo.js", () => ({
  setPageSeo: api.setPageSeo, articleJsonLd: () => ({}), breadcrumbJsonLd: () => ({}),
}));
vi.mock("../components/Skeleton.jsx", () => ({
  ArticleBodySkeleton: () => <div data-testid="body-loading">Loading body</div>,
}));
vi.mock("../components/EmptyState.jsx", () => ({
  default: ({ title, action }) => <section><h2>{title}</h2>{action}</section>,
}));
vi.mock("../components/article/ArticleHeader.jsx", () => ({
  default: ({ article, commentCount }) => <header><h1>{article.title}</h1><span data-testid="header-count">{commentCount}</span></header>,
}));
vi.mock("../components/article/ArticleHero.jsx", () => ({ default: () => null }));
vi.mock("../components/article/ArticleBody.jsx", () => ({
  default: ({ blocks }) => <div data-testid="body">{blocks.map((b, i) => <p key={i}>{b.text || (b.items || []).join(" ")}</p>)}</div>,
}));
vi.mock("../components/article/ArticlePager.jsx", () => ({ default: () => <nav data-testid="pager" /> }));
vi.mock("../components/article/ArticleCommentBar.jsx", () => ({
  default: ({ commentCount }) => <span data-testid="bar-count">{commentCount}</span>,
}));
vi.mock("../components/Comments.jsx", () => ({
  default: ({ slug, onCount }) => <button onClick={() => onCount(7)}>Count {slug}</button>,
}));
vi.mock("../components/article/RelatedStories.jsx", () => ({
  default: ({ articles }) => <aside>{articles.map((a, i) => <p key={i}>{a.title}</p>)}</aside>,
}));

const preview = { id: 1, slug: "story-a", title: "Story A", sport: "football" };
const full = { ...preview, content: "Verified body for article A." };
const fullB = { id: 2, slug: "story-b", title: "Story B", sport: "football", content: "Verified body for article B." };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function mount(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/article/story-a", state }]}>
      <Link to="/article/story-a">Open A</Link><Link to="/article/story-b">Open B</Link>
      <Routes><Route path="/article/:slug" element={<ArticlePage />} /><Route path="/" element={<p>Home</p>} /></Routes>
    </MemoryRouter>
  );
}
async function bodyReady(text = full.content) { return screen.findByText(text); }

beforeEach(() => {
  vi.clearAllMocks();
  api.peekArticle.mockReturnValue(null);
  api.getArticle.mockResolvedValue(full);
  api.getJSON.mockResolvedValue(full);
  api.getRelated.mockResolvedValue([]);
  api.recordView.mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("isolated News reader state", () => {
  it("paints the correct preview immediately then replaces it with the full body", async () => {
    const read = deferred(); api.getArticle.mockReturnValue(read.promise);
    mount({ preview });
    expect(screen.getByRole("heading", { name: "Story A" })).toBeTruthy();
    expect(screen.getByTestId("body-loading")).toBeTruthy();
    await act(async () => read.resolve(full));
    await bodyReady();
    expect(screen.queryByTestId("body-loading")).toBeNull();
    expect(api.recordView).toHaveBeenCalledWith("story-a");
  });

  it("does not leave a failed preview in an endless skeleton and retries only this article", async () => {
    api.getArticle.mockRejectedValue(new Error("offline"));
    mount({ preview });
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load article");
    expect(screen.queryByTestId("body-loading")).toBeNull();
    expect(screen.getByRole("heading", { name: "Story A" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await bodyReady();
    expect(api.getJSON).toHaveBeenCalledWith("/articles/story-a", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(api.getArticle).toHaveBeenCalledTimes(1);
    expect(api.recordView).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers retry after a direct article read fails without any preview", async () => {
    api.getArticle.mockRejectedValue(new Error("offline"));
    mount();
    await screen.findByText("Could not load article");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await bodyReady();
  });

  it("removes even a complete cached article when the response is 404", async () => {
    api.peekArticle.mockReturnValue(full);
    api.getArticle.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    mount();
    await screen.findByText("Article not found");
    expect(screen.queryByRole("heading", { name: "Story A" })).toBeNull();
    expect(screen.queryByText(full.content)).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(api.recordView).not.toHaveBeenCalled();
  });

  it.each([null, [], { ...full, slug: "story-b" }, { ...full, title: " " }])(
    "rejects malformed or wrong-identity detail data %# without counting a view",
    async (data) => {
      api.getArticle.mockResolvedValue(data);
      mount({ preview });
      await screen.findByRole("alert");
      expect(screen.queryByTestId("body-loading")).toBeNull();
      expect(screen.queryByText(full.content)).toBeNull();
      expect(api.recordView).not.toHaveBeenCalled();
    }
  );

  it("does not present an empty successful response as completed or still loading", async () => {
    api.getArticle.mockResolvedValue({ ...preview, blocks: [], content: "" });
    mount({ preview });
    await screen.findByRole("alert");
    expect(screen.queryByTestId("body-loading")).toBeNull();
    expect(screen.queryByTestId("body")).toBeNull();
    expect(screen.queryByTestId("pager")).toBeNull();
    expect(api.recordView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await bodyReady();
  });

  it("uses real content when the optional blocks array is empty", async () => {
    api.getArticle.mockResolvedValue({ ...full, blocks: [] });
    mount();
    await bodyReady();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ignores a late article response after navigating to a different story", async () => {
    const readA = deferred();
    api.getArticle.mockImplementation((slug) => slug === "story-a" ? readA.promise : Promise.resolve(fullB));
    mount({ preview });
    fireEvent.click(screen.getByRole("link", { name: "Open B" }));
    await bodyReady(fullB.content);
    await act(async () => readA.resolve(full));
    expect(screen.queryByText(full.content)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Story A" })).toBeNull();
    expect(api.recordView).toHaveBeenCalledTimes(1);
    expect(api.recordView).toHaveBeenCalledWith("story-b");
  });

  it("ignores old related results after navigating to another article", async () => {
    const relatedA = deferred();
    api.getArticle.mockImplementation((slug) => Promise.resolve(slug === "story-a" ? full : fullB));
    api.getRelated.mockImplementation((slug) => slug === "story-a" ? relatedA.promise : Promise.resolve([]));
    mount(); await bodyReady();
    fireEvent.click(screen.getByRole("link", { name: "Open B" }));
    await bodyReady(fullB.content);
    await act(async () => relatedA.resolve([{ id: 99, slug: "old-related", title: "Old related story" }]));
    expect(screen.queryByText("Old related story")).toBeNull();
  });

  it("bounds a stalled request and can retry without rejoining that pending request", async () => {
    vi.useFakeTimers();
    const stalled = deferred(); api.getArticle.mockReturnValue(stalled.promise);
    mount({ preview });
    await act(async () => { await vi.advanceTimersByTimeAsync(15001); });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load article");
    expect(screen.queryByTestId("body-loading")).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry" })));
    expect(screen.getByText(full.content)).toBeTruthy();
    await act(async () => stalled.resolve({ ...full, content: "Late obsolete body" }));
    expect(screen.queryByText("Late obsolete body")).toBeNull();
    expect(api.recordView).toHaveBeenCalledTimes(1);
  });

  it("resets article comment counts when navigating to another story", async () => {
    api.getArticle.mockImplementation((slug) => Promise.resolve(slug === "story-a" ? full : fullB));
    mount(); await bodyReady();
    fireEvent.click(screen.getByRole("button", { name: "Count story-a" }));
    expect(screen.getByTestId("bar-count")).toHaveTextContent("7");
    fireEvent.click(screen.getByRole("link", { name: "Open B" }));
    await bodyReady(fullB.content);
    expect(screen.getByTestId("header-count")).toHaveTextContent("0");
    expect(screen.getByTestId("bar-count")).toHaveTextContent("0");
  });

  it("keeps readable cached content with a visible refresh failure notice", async () => {
    api.peekArticle.mockReturnValue(full);
    api.getArticle.mockRejectedValue(new Error("offline"));
    mount();
    await screen.findByRole("alert");
    expect(screen.getByText(full.content)).toBeTruthy();
    expect(screen.queryByTestId("body-loading")).toBeNull();
  });

  it("ignores a wrong-route cached object and wrong-route preview", async () => {
    const read = deferred(); api.getArticle.mockReturnValue(read.promise);
    api.peekArticle.mockReturnValue(fullB);
    mount({ preview: fullB });
    expect(screen.queryByRole("heading", { name: "Story B" })).toBeNull();
    await act(async () => read.resolve(full));
    await bodyReady();
  });

  it("does not count a related block alone as article content", async () => {
    api.getArticle.mockResolvedValue({ ...preview, blocks: [{ type: "related", article: fullB }] });
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByTestId("body")).toBeNull();
    expect(api.recordView).not.toHaveBeenCalled();
  });

  it("still displays the full article when the related request fails", async () => {
    api.getRelated.mockRejectedValue(new Error("offline related"));
    mount(); await bodyReady();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(api.recordView).toHaveBeenCalledTimes(1);
  });

  it("aborts an explicit fresh retry when leaving the article", async () => {
    api.getArticle.mockImplementation((slug) => slug === "story-a" ? Promise.reject(new Error("offline")) : Promise.resolve(fullB));
    api.getJSON.mockReturnValue(new Promise(() => {}));
    mount({ preview }); await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(api.getJSON).toHaveBeenCalledTimes(1));
    const signal = api.getJSON.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(false);
    fireEvent.click(screen.getByRole("link", { name: "Open B" }));
    await bodyReady(fullB.content);
    expect(signal.aborted).toBe(true);
  });
});
