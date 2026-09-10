const STORAGE_KEY = "ninkosports.saved.v1";

export function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function writeSaved(items) {
  const unique = [];
  const seen = new Set();
  (items || []).forEach((item) => {
    const key = item?.id || item?.slug;
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  return unique;
}

export function isSaved(article) {
  if (!article) return false;
  return readSaved().some((item) => item.id === article.id || item.slug === article.slug);
}

export function toggleSavedLocal(article) {
  const current = readSaved();
  const exists = current.some((item) => item.id === article.id || item.slug === article.slug);
  const next = exists
    ? current.filter((item) => item.id !== article.id && item.slug !== article.slug)
    : [article, ...current];
  return writeSaved(next);
}
