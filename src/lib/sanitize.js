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

const IMAGE_CAPTION_PREFIX_RE = /^image captions?\s*[,:\-–—]?\s*/i;
const PUBLISHED_AGO_PREFIX_RE =
  /^(?:published|updated)\s+\d+\s+(?:minute|hour|day|week)s?\s+ago\s*/i;
const CMS_FRAGMENT_RE =
  /^(?:image captions?|top scorers(?:\s+gossip)?|scorers(?:\s+gossip)?|gossip|scores?\s*(?:&|and)\s*fixtures|live scores?|match reports?|(?:published|updated)\s+\d+\s+(?:minute|hour|day|week)s?\s+ago)$/i;
const CMS_KICKER_TOKEN_RE = /^[A-Z0-9][A-Za-z0-9'’+.-]{0,22}$/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCmsKickerPrefix(prefix) {
  const raw = (prefix || "").trim();
  if (!raw || raw.length > 80 || /[.!?]/.test(raw)) return false;
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 6) return false;
  return tokens.every(
    (token) => token.toLowerCase() === "and" || token === "&" || CMS_KICKER_TOKEN_RE.test(token)
  );
}

function stripLeadingCmsAndTitle(text, title) {
  let out = String(text || "")
    .replace(IMAGE_CAPTION_PREFIX_RE, "")
    .replace(PUBLISHED_AGO_PREFIX_RE, "")
    .trim();
  const titleClean = (title || "").trim();
  if (titleClean.length >= 8) {
    const idx = out.toLowerCase().indexOf(titleClean.toLowerCase());
    if (idx > 0 && idx <= 80) {
      const prefix = out.slice(0, idx).trim();
      if (isCmsKickerPrefix(prefix) || CMS_FRAGMENT_RE.test(prefix)) {
        out = out.slice(idx).trim();
      }
    }
    const titlePrefix = new RegExp(
      `^${escapeRegExp(titleClean)}(?:\\s*[.!?–—-])?\\s+`,
      "i"
    );
    for (let i = 0; i < 3; i += 1) {
      const next = out.replace(titlePrefix, "").trim();
      if (next === out) break;
      out = next;
    }
  }
  return out;
}

export function isCmsFragment(text) {
  const raw = (text || "").trim().replace(/[.,;:]+$/, "");
  return Boolean(raw) && CMS_FRAGMENT_RE.test(raw);
}

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
  out = stripLeadingCmsAndTitle(out, title);
  return out;
}

export function publicHasHiddenSource(payload) {
  if (!payload || typeof payload !== "object") return true;
  return !("source_url" in payload) && !("publisher" in payload);
}
