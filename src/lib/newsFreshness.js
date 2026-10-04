import { isPublisherBranding } from './newsMedia.js';
const EDITORIAL_TIME_ZONE = "Australia/Sydney";

// The News API stores UTC and currently serializes SQL timestamps without an
// offset. Interpret that documented shape as UTC, independent of reader locale.
// Preserve explicit offsets and Date objects; never replace publication times.
export function newsTimestamp(value) {
  if (typeof value !== "string") return value;
  const stamp = value.trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(stamp)) {
    return stamp.replace(" ", "T") + "Z";
  }
  return stamp;
}

function editorialDateKey(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(newsTimestamp(value));
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: EDITORIAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return values.year && values.month && values.day
    ? `${values.year}-${values.month}-${values.day}`
    : "";
}

export function isEditorialToday(article, now = new Date()) {
  const stamp = article?.published_at || article?.created_at;
  const articleDay = editorialDateKey(stamp);
  const today = editorialDateKey(now);
  return Boolean(articleDay && today && articleDay === today);
}

export function filterEditorialToday(rows, now = new Date()) {
  return (Array.isArray(rows) ? rows : []).filter((row) => isEditorialToday(row, now));
}

export function filterPortalHomeToday(payload, now = new Date()) {
  if (!payload || typeof payload !== "object") return payload || null;
  const featured = filterEditorialToday(payload.featured, now);
  const latest = filterEditorialToday(payload.latest, now);
  const filteredFeatured = featured.length ? featured : latest.slice(0, 5);

  const bySport = {};
  Object.entries(payload.by_sport || {}).forEach(([sport, rows]) => {
    const fresh = filterEditorialToday(rows, now);
    if (fresh.length) bySport[sport] = fresh;
  });

  const byLeague = (payload.by_league || [])
    .map((group) => ({
      ...group,
      articles: filterEditorialToday(group?.articles, now),
    }))
    .filter((group) => group.articles.length);

  return {
    ...payload,
    featured: filteredFeatured,
    latest,
    breaking: filterEditorialToday(payload.breaking, now),
    most_read: filterEditorialToday(payload.most_read, now),
    by_sport: bySport,
    by_league: byLeague,
  };
}

// Freshness is an ingestion rule, not an expiry rule for published articles.
// Retain the original publication time and keep older public News browsable.
export function publishedNewsRows(rows, now = new Date()) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => {
      if (isPublisherBranding(row?.image_url)) return false;
      const stamp = row?.published_at || row?.created_at;
      const millis = stamp ? new Date(newsTimestamp(stamp)).getTime() : NaN;
      return Number.isFinite(millis) && millis <= now.getTime();
    })
    .sort((a, b) => new Date(newsTimestamp(b.published_at || b.created_at))
      - new Date(newsTimestamp(a.published_at || a.created_at)));
}

export function publishedNewsArchiveRows(rows, now = new Date()) {
  // The legacy search endpoint also returns old imported source copies.
  // Archive retention must not promote those into original NinkoSports News.
  return publishedNewsRows(rows, now).filter((row) =>
    row.ai_generated === true && row.quality_ok === true && row.sport_match_ok === true
    && typeof row.image_url === "string" && row.image_url.trim()
    && ["EDITORIAL_PHOTO", "UNKNOWN"].includes(row.hero_media_kind)
  );
}

export function preparePortalHomeNews(payload, now = new Date()) {
  if (!payload || typeof payload !== "object") return payload || null;
  const featured = publishedNewsRows(payload.featured, now);
  const latest = publishedNewsRows(payload.latest, now);
  const todayFeatured = filterEditorialToday(featured, now);
  const todayLatest = filterEditorialToday(latest, now);
  return {
    ...payload,
    featured: todayFeatured.length ? todayFeatured
      : todayLatest.length ? todayLatest.slice(0, 5)
      : featured.length ? featured : latest.slice(0, 5),
    latest,
    breaking: filterEditorialToday(payload.breaking, now),
    most_read: publishedNewsRows(payload.most_read, now),
    by_sport: Object.fromEntries(Object.entries(payload.by_sport || {})
      .map(([sport, rows]) => [sport, publishedNewsRows(rows, now)])
      .filter(([, rows]) => rows.length)),
    by_league: (payload.by_league || [])
      .map((group) => ({ ...group, articles: publishedNewsRows(group.articles, now) }))
      .filter((group) => group.articles.length),
  };
}
