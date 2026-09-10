const STORAGE_KEY = "ninkosports.favorites.v1";

export function emptyFavorites() {
  return { sports: [], leagues: [], teams: [] };
}

export function readFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyFavorites();
    const parsed = JSON.parse(raw);
    return {
      sports: Array.isArray(parsed.sports) ? parsed.sports : [],
      leagues: Array.isArray(parsed.leagues) ? parsed.leagues : [],
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
    };
  } catch (err) {
    return emptyFavorites();
  }
}

export function writeFavorites(next) {
  const value = {
    sports: Array.from(new Set(next.sports || [])),
    leagues: Array.from(new Set(next.leagues || [])),
    teams: Array.from(new Set(next.teams || [])),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  return value;
}

export function toggleFavorite(type, value) {
  const current = readFavorites();
  const list = current[type] || [];
  const exists = list.includes(value);
  const nextList = exists ? list.filter((item) => item !== value) : [...list, value];
  return writeFavorites({ ...current, [type]: nextList });
}

export function isFollowed(type, value) {
  return (readFavorites()[type] || []).includes(value);
}
