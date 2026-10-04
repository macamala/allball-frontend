/** Known publisher artwork is not an article photograph, even when marked JPEG/PNG. */
export function isPublisherBranding(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '').toLowerCase();
    return host === 'soccernews.com' && /^\/og\/og-image\.(?:png|jpe?g|webp)$/.test(path);
  } catch { return false; }
}
