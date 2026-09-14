import {
  MAIN_SPORTS,
  parseScopedCompetition,
  scopedCompetitionId,
} from "../config/sports.js";

const STORAGE_KEY = "ninkosports.favorites.v1";

export function emptyFavorites() {
  return { sports: [], leagues: [], teams: [] };
}

function guessSport(league) {
  const parsed = parseScopedCompetition(league);
  if (parsed.sport) return parsed.sport;
  for (const sport of MAIN_SPORTS) {
    if (sport.leagues.some((item) => item.league === league)) return sport.slug;
  }
  return "football";
}

export function normalizeLeagueId(value) {
  if (!value) return "";
  const raw = String(value);
  if (raw.includes(":")) return raw;
  return scopedCompetitionId(guessSport(raw), raw);
}

export function normalizeFavorites(input) {
  const value = input || emptyFavorites();
  return {
    sports: Array.from(new Set((value.sports || []).filter(Boolean))),
    leagues: Array.from(
      new Set((value.leagues || []).map(normalizeLeagueId).filter(Boolean))
    ),
    teams: Array.from(new Set((value.teams || []).filter(Boolean))),
  };
}

export function readFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyFavorites();
    const parsed = JSON.parse(raw);
    return normalizeFavorites(parsed);
  } catch (err) {
    return emptyFavorites();
  }
}

export function writeFavorites(next) {
  const value = normalizeFavorites(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  return value;
}

export function toggleFavorite(type, value) {
  const current = readFavorites();
  const normalized = type === "leagues" ? normalizeLeagueId(value) : value;
  const list = current[type] || [];
  const exists = list.includes(normalized);
  const nextList = exists ? list.filter((item) => item !== normalized) : [...list, normalized];
  return writeFavorites({ ...current, [type]: nextList });
}

export function isFollowed(type, value) {
  const normalized = type === "leagues" ? normalizeLeagueId(value) : value;
  return (readFavorites()[type] || []).includes(normalized);
}
