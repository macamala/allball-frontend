export const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const metaCache = { data: null, at: 0 };
const META_TTL = 5 * 60 * 1000;

export async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function getArticles(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return getJSON(`/articles${qs ? `?${qs}` : ""}`);
}

export function getPortalHome() {
  return getJSON("/portal/home");
}

export function getArticle(slug) {
  return getJSON(`/articles/${encodeURIComponent(slug)}`);
}

export function getRelated(slug, limit = 6) {
  return getJSON(
    `/articles/${encodeURIComponent(slug)}/related?limit=${limit}`
  );
}

export function searchArticles(q, extra = {}) {
  const params = new URLSearchParams({ q, limit: String(extra.limit || 20) });
  if (extra.sport) params.set("sport", extra.sport);
  if (extra.league) params.set("league", extra.league);
  return getJSON(`/search?${params.toString()}`);
}

export function recordView(slug) {
  return fetch(`${API_BASE}/articles/${encodeURIComponent(slug)}/view`, {
    method: "POST",
  }).catch(() => null);
}

export function getSportsDataStatus() {
  return getJSON("/sports-data/status");
}

export function getScores() {
  return getJSON("/sports-data/scores");
}

export function getStandings(league) {
  const qs = league ? `?league=${encodeURIComponent(league)}` : "";
  return getJSON(`/sports-data/standings${qs}`);
}

export function getMatch(id) {
  return getJSON(`/sports-data/matches/${encodeURIComponent(id)}`);
}

export async function getMeta() {
  const now = Date.now();
  if (metaCache.data && now - metaCache.at < META_TTL) {
    return metaCache.data;
  }
  const [sports, leagues] = await Promise.all([
    getJSON("/meta/sports"),
    getJSON("/meta/leagues"),
  ]);
  metaCache.data = { sports: sports || [], leagues: leagues || [] };
  metaCache.at = now;
  return metaCache.data;
}
