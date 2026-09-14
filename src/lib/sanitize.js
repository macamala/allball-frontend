/** Presentation-only sanitizer. Does not rewrite facts or invent copy. */

const TRUNCATION_RE = /\[(?:\s*)\+\s*\d+\s*chars?(?:\s*)\]/gi;
const ELLIPSIS_MARK_RE = /\[\s*(?:\.{3}|…)\s*\]/g;
const CDATA_OPEN_RE = /<!\[CDATA\[/gi;
const CDATA_CLOSE_RE = /\]\]>/g;
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi;
const MENU_ESPN_RE = /(?:-->\s*)?menu\s+espn\b/gi;
const SKIP_NAV_RE = /skip to (?:main content|content|navigation|main navigation)/gi;
const VIDEO_CHROME_RE = /\bplay\s+[A-Z][\w .'-]{0,40}:\s+.{8,140}?\(\d{1,2}:\d{2}\)/gi;
const ARROW_MENU_RE = /-->\s*/g;
const COOKIE_RE = /\bcookie (?:policy|consent|settings|notice)\b/gi;
const CHROME_LINE_RE =
  /(required fields are marked|notify me of follow-up comments|leave a reply|leave a comment|your email address will not be published|save my name, email|post comment|subscribe to our newsletter|latest italian football news|we use cookies|all rights reserved)/gi;

export function sanitizeText(text, title) {
  if (!text) return "";
  let out = String(text)
    .replace(CDATA_OPEN_RE, " ")
    .replace(CDATA_CLOSE_RE, " ")
    .replace(HTML_TAG_RE, " ")
    .replace(TRUNCATION_RE, " ")
    .replace(ELLIPSIS_MARK_RE, " ")
    .replace(MENU_ESPN_RE, " ")
    .replace(SKIP_NAV_RE, " ")
    .replace(COOKIE_RE, " ")
    .replace(VIDEO_CHROME_RE, " ")
    .replace(CHROME_LINE_RE, " ")
    .replace(ARROW_MENU_RE, " ")
    .replace(/\bpic\.twitter\.com\/\S+/gi, " ")
    .replace(/https?:\/\/(?:www\.)?(?:x|twitter|t\.co)\.com\/\S+/gi, " ")
    .replace(/\bwatch now on\b.{0,120}/gi, " ")
    .replace(
      /(?:[A-Za-z0-9 .,'&/-]{0,80})?\(@[\w.]+\)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      " "
    )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const titleClean = (title || "").trim();
  if (titleClean.length >= 8) {
    const prefix = new RegExp(
      `^${titleClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s*[.!?–—-])?\\s+`,
      "i"
    );
    for (let i = 0; i < 3; i += 1) {
      const next = out.replace(prefix, "").trim();
      if (next === out) break;
      out = next;
    }
  }
  return out;
}

export function publicHasHiddenSource(payload) {
  if (!payload || typeof payload !== "object") return true;
  return !("source_url" in payload) && !("publisher" in payload);
}
