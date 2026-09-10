export const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const metaCache = { data: null, at: 0 };
const META_TTL = 5 * 60 * 1000;
let csrfToken = "";

export function setCsrfToken(token) {
  if (token) csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    return {};
  }
}

export async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
  });
  const data = await parseBody(res);
  if (data && data.csrf) setCsrfToken(data.csrf);
  if (!res.ok) {
    const err = new Error(data.detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return data;
}

export async function sendJSON(path, method, body) {
  if (!csrfToken) {
    try {
      const boot = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
      const data = await parseBody(boot);
      if (data.csrf) setCsrfToken(data.csrf);
    } catch (err) {
      // Continue; the write request will fail clearly if CSRF is still missing.
    }
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await parseBody(res);
  if (data && data.csrf) setCsrfToken(data.csrf);
  if (res.status === 403 && !path.includes("/auth/csrf")) {
    const boot = await getJSON("/auth/csrf");
    if (boot.csrf) setCsrfToken(boot.csrf);
    const retry = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const retryData = await parseBody(retry);
    if (retryData && retryData.csrf) setCsrfToken(retryData.csrf);
    if (!retry.ok) {
      const err = new Error(retryData.detail || `HTTP ${retry.status}`);
      err.status = retry.status;
      err.detail = retryData.detail;
      throw err;
    }
    return retryData;
  }
  if (!res.ok) {
    const err = new Error(data.detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return data;
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

export function getRecentArticles(limit = 12) {
  return getJSON(`/articles/recent?limit=${limit}`);
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

export function getMostRead(limit = 8) {
  return getJSON(`/articles/most-read?limit=${limit}`);
}

export function getComments(slug) {
  return getJSON(`/articles/${encodeURIComponent(slug)}/comments`);
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
    credentials: "include",
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
