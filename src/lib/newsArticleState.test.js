import { describe, expect, it } from "vitest";
import { hasNewsArticleBody, isNewsArticleForSlug, newsArticleBlocks, newsArticleShell } from "./newsArticleState.js";

const article = { slug: "example", title: "Example title", content: "A verified paragraph." };
describe("news-only article boundary", () => {
  it("requires the exact requested slug and a real title", () => {
    expect(isNewsArticleForSlug(article, "example")).toBe(true);
    for (const bad of [null, [], {}, { ...article, slug: "other" }, { ...article, title: " " }]) {
      expect(isNewsArticleForSlug(bad, "example")).toBe(false);
    }
  });
  it("uses only a matching cached article or matching preview", () => {
    const wrong = { ...article, slug: "wrong" };
    expect(newsArticleShell(wrong, article, "example")).toBe(article);
    expect(newsArticleShell(article, wrong, "example")).toBe(article);
    expect(newsArticleShell(wrong, wrong, "example")).toBeNull();
  });
  it("falls back to real content when optional blocks are empty", () => {
    expect(newsArticleBlocks({ ...article, blocks: [] })).toEqual([{ type: "paragraph", text: article.content }]);
  });
  it("does not invent a body from the headline or summary", () => {
    const blocks = newsArticleBlocks({ slug: "example", title: "Headline", summary: "Only a short deck" });
    expect(blocks).toEqual([]);
    expect(hasNewsArticleBody(blocks)).toBe(false);
  });
  it("drops malformed blocks and non-string list entries without crashing", () => {
    const blocks = newsArticleBlocks({ ...article, content: { invalid: true }, blocks: [
      null, "bad", [], { type: "paragraph", text: { bad: true } },
      { type: "list", items: "not an array" },
      { type: "list", items: [null, {}, "", "Actual bullet"] },
      { type: "paragraph", text: "Actual paragraph" },
    ] });
    expect(blocks).toEqual([
      { type: "list", items: ["Actual bullet"] },
      { type: "paragraph", text: "Actual paragraph" },
    ]);
  });
  it("excludes captions, credit-only text and the repeated headline", () => {
    expect(newsArticleBlocks({ ...article, content: "", blocks: [
      { type: "caption", text: "Photo caption" },
      { type: "paragraph", text: "Photo: Example Photographer" },
      { type: "paragraph", text: article.title },
    ] })).toEqual([]);
  });
  it("does not count a related card or repeated hero as body content", () => {
    expect(hasNewsArticleBody(newsArticleBlocks({ ...article, content: "", blocks: [
      { type: "related", article },
      { type: "media", url: "https://example.test/hero.jpg", is_hero: true },
    ] }))).toBe(false);
  });
  it("preserves a real inline image and quote", () => {
    const blocks = newsArticleBlocks({ ...article, content: "", blocks: [
      { type: "media", url: "https://example.test/photo.jpg" },
      { type: "quote", text: "An actual quotation" },
    ] });
    expect(blocks).toHaveLength(2);
    expect(hasNewsArticleBody(blocks)).toBe(true);
  });
  it("never mutates the original cache object or publication date", () => {
    const source = Object.freeze({ ...article, published_at: "2026-09-25T04:00:00Z", blocks: Object.freeze([
      Object.freeze({ type: "list", items: Object.freeze(["Bullet", null]) }),
    ]) });
    const before = JSON.stringify(source);
    newsArticleBlocks(source);
    expect(JSON.stringify(source)).toBe(before);
  });
});
