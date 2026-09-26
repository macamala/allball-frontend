import { resolveBlocks } from "./articleBlocks.js";

// A feed preview is useful for first paint, but never authority for another URL.
export function isNewsArticleForSlug(article, slug) {
  return Boolean(
    article &&
      typeof article === "object" &&
      !Array.isArray(article) &&
      typeof slug === "string" &&
      slug &&
      article.slug === slug &&
      typeof article.title === "string" &&
      article.title.trim()
  );
}

// Validate only the reader's block contract. Do not invent content from a deck,
// change publication dates, or mutate the shared cached API object.
export function newsArticleBlocks(article) {
  if (!article || typeof article !== "object") return [];
  const blocks = Array.isArray(article.blocks)
    ? article.blocks.flatMap((block) => {
        if (!block || typeof block !== "object" || Array.isArray(block)) return [];
        const type = block.type || "paragraph";
        if (type === "list") {
          const items = Array.isArray(block.items)
            ? block.items.filter((item) => typeof item === "string" && item.trim())
            : [];
          return items.length ? [{ ...block, type, items }] : [];
        }
        if (type === "media") {
          return typeof block.url === "string" && block.url.trim()
            ? [{ ...block, type }]
            : [];
        }
        if (type === "related") {
          return isNewsArticleForSlug(block.article, block.article?.slug)
            ? [{ ...block, type }]
            : [];
        }
        if (!["paragraph", "quote", "heading"].includes(type)) return [];
        return typeof block.text === "string" && block.text.trim()
          ? [{ ...block, type }]
          : [];
      })
    : [];
  return resolveBlocks({
    ...article,
    title: typeof article.title === "string" ? article.title : "",
    content: typeof article.content === "string" ? article.content : "",
    blocks,
  });
}

export function hasNewsArticleBody(blocks) {
  return blocks.some((block) =>
    block.type !== "related" && !(block.type === "media" && block.is_hero)
  );
}

export function newsArticleShell(cached, preview, slug) {
  if (isNewsArticleForSlug(cached, slug)) return cached;
  return isNewsArticleForSlug(preview, slug) ? preview : null;
}
