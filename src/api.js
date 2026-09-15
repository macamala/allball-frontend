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

const inflight = new Map();
const memoryCache = new Map();
const LIST_TTL = 30 * 1000;
const ARTICLE_TTL = 60 * 1000;

export function clearPublicCache() {
  memoryCache.clear();
  inflight.clear();
}

export function peekCached(path) {
  const hit = memoryCache.get(path);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    memoryCache.delete(path);
    return null;
  }
  return hit.data;
}

function cachedGetJSON(path, ttlMs) {
  const fresh = peekCached(path);
  if (fresh !== null) return Promise.resolve(fresh);
  if (inflight.has(path)) return inflight.get(path);
  const pending = getJSON(path)
    .then((data) => {
      memoryCache.set(path, { data, expires: Date.now() + ttlMs });
      inflight.delete(path);
      return data;
    })
    .catch((err) => {
      inflight.delete(path);
      throw err;
    });
  inflight.set(path, pending);
  return pending;
}

export function articlesPath(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return `/articles${qs ? `?${qs}` : ""}`;
}

export function articlePath(slug) {
  return `/articles/${encodeURIComponent(slug)}`;
}

export function getArticles(params = {}) {
  return cachedGetJSON(articlesPath(params), LIST_TTL);
}

export function peekArticles(params = {}) {
  return peekCached(articlesPath(params));
}

export function getRecentArticles(limit = 12) {
  return cachedGetJSON(`/articles/recent?limit=${limit}`, LIST_TTL);
}

export function getPortalHome() {
  return cachedGetJSON("/portal/home", LIST_TTL);
}

export function peekPortalHome() {
  return peekCached("/portal/home");
}

export function getArticle(slug) {
  return cachedGetJSON(articlePath(slug), ARTICLE_TTL);
}

export function peekArticle(slug) {
  return peekCached(articlePath(slug));
}

export function prefetchArticle(slug) {
  if (!slug) return;
  const path = articlePath(slug);
  if (peekCached(path) || inflight.has(path)) return;
  cachedGetJSON(path, ARTICLE_TTL).catch(() => {});
}

export function getRelated(slug, limit = 6) {
  return cachedGetJSON(
    `/articles/${encodeURIComponent(slug)}/related?limit=${limit}`,
    ARTICLE_TTL
  );
}

export function getMostRead(limit = 8) {
  return cachedGetJSON(`/articles/most-read?limit=${limit}`, LIST_TTL);
}

export function getComments(slug) {
  return getJSON(`/articles/${encodeURIComponent(slug)}/comments`);
}

export function searchArticles(q, extra = {}) {
  const params = new URLSearchParams({ q, limit: String(extra.limit || 20) });
  if (extra.sport) params.set("sport", extra.sport);
  if (extra.league) params.set("league", extra.league);
  return cachedGetJSON(`/search?${params.toString()}`, LIST_TTL);
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

export function getAuthProviders() {
  return getJSON("/auth/providers");
}

export function startSocialLogin(provider) {
  return getJSON(`/auth/${provider}/start`);
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
