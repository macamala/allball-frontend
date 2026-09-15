import { isCmsFragment } from "./sanitize.js";

export function isPhotoCreditCaption(text) {
  const raw = (text || "").trim();
  if (!raw) return false;
  if (/\(\s*Photo by\s+/i.test(raw) || /Getty Images/i.test(raw)) return true;
  if (/^(?:photo(?:graph)?(?:\s+by)?\s*:)/i.test(raw)) return true;
  return /^(?:[A-Z][A-Z .'-]{1,48},\s+)?[A-Z][A-Z .'-]{1,40}\s+[-–—]\s+[A-Z]{3,9}\s+\d/.test(
    raw
  );
}

export function publicDeck(text) {
  const raw = (text || "").trim();
  if (!raw) return "";
  if (!isPhotoCreditCaption(raw) && !/\(\s*Photo by\s+/i.test(raw) && !/Getty Images/i.test(raw)) {
    return raw;
  }
  const stripped = raw
    .replace(/^[\s\S]*?(?:\(\s*Photo by [^)]+\)|\(Getty Images\))\s*/i, "")
    .trim();
  if (!stripped || isPhotoCreditCaption(stripped)) return "";
  return stripped;
}

export function heroMedia(article) {
  const media = Array.isArray(article?.media) ? article.media : [];
  const hero = media.find((item) => item?.is_hero) || media[0];
  if (hero?.url) {
    return {
      ...hero,
      url: hero.url,
      presentation: hero.presentation || article?.hero_media_kind,
    };
  }
  if (article?.image_url) {
    return {
      url: article.image_url,
      caption: "",
      is_hero: true,
      media_type: "image",
      presentation: article?.hero_media_kind,
    };
  }
  return null;
}

export function resolveBlocks(article) {
  const source =
    Array.isArray(article?.blocks) && article.blocks.length
      ? article.blocks
      : (article?.content || "")
          .split(/\n+/)
          .map((part) => part.trim())
          .filter(Boolean)
          .map((paragraph) => ({ type: "paragraph", text: paragraph }));
  const title = article?.title || "";
  return source.filter((block) => {
    if (!block) return false;
    if (block.type === "caption") return false;
    if (block.type === "paragraph") {
      const text = (block.text || "").trim();
      if (!text || isPhotoCreditCaption(text) || isCmsFragment(text)) return false;
      if (title && text.toLowerCase() === String(title).trim().toLowerCase()) {
        return false;
      }
    }
    return true;
  });
}
