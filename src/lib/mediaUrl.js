/** Same-image CDN size selection. String rewrites only — never fetches. */

const DISPLAY_WIDTHS = {
  thumb: 320,
  card: 800,
  featured: 1280,
  hero: 1600,
};

const QUERY_WIDTH_KEYS = new Set([
  "w",
  "width",
  "maxwidth",
  "max_width",
  "max-width",
  "resize",
  "rwidth",
  "fitw",
]);

const PATH_WIDTH_RE = /(\/(?:ace\/(?:standard|ws)|news|iplayer)\/)(\d{2,4})(?=\/)/i;
const WP_CROP_RE = /-(\d{2,4})x(\d{2,4})(?=\.(?:jpe?g|png|webp|gif)(?:$|\?))/i;

export function widthFromUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return 0;
  const pathMatch = raw.match(PATH_WIDTH_RE);
  if (pathMatch) return Number(pathMatch[2]);
  try {
    const parsed = new URL(raw);
    for (const [key, value] of parsed.searchParams.entries()) {
      if (QUERY_WIDTH_KEYS.has(key.toLowerCase()) && /^\d+$/.test(value)) {
        return Number(value);
      }
    }
    const crop = parsed.pathname.match(WP_CROP_RE);
    if (crop) return Number(crop[1]);
  } catch {
    return 0;
  }
  return 0;
}

export function imageUrlForDisplay(url, role = "card") {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  const target = DISPLAY_WIDTHS[role] || DISPLAY_WIDTHS.card;
  const current = widthFromUrl(raw);
  if (current <= 0) return raw;
  if (current === target) return raw;
  return replaceWidth(raw, target) || raw;
}

function replaceWidth(url, width) {
  if (PATH_WIDTH_RE.test(url)) {
    return url.replace(PATH_WIDTH_RE, `$1${width}`);
  }
  try {
    const parsed = new URL(url);
    let changed = false;
    for (const [key, value] of [...parsed.searchParams.entries()]) {
      if (QUERY_WIDTH_KEYS.has(key.toLowerCase()) && /^\d+$/.test(value)) {
        parsed.searchParams.set(key, String(width));
        changed = true;
      }
    }
    if (changed) return parsed.toString();
    const crop = parsed.pathname.match(WP_CROP_RE);
    if (crop && Number(crop[1]) < width && width >= 800) {
      parsed.pathname = parsed.pathname.replace(WP_CROP_RE, "");
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
}
