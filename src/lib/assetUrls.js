// Only expand known FIFA image routes, preserving the exact source entity ID.
export function normalizeAssetUrl(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.host !== "api.fifa.com" || url.username || url.password) return value;
    const match = decodeURIComponent(url.pathname).match(/^\/api\/v3\/picture\/(flags|teams)-\{format\}-\{size\}\/([A-Za-z0-9_-]{1,128})$/);
    if (!match) return value;
    url.pathname = `/api/v3/picture/${match[1]}-sq-2/${match[2]}`;
    return url.toString();
  } catch {
    return value;
  }
}
