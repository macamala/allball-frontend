import catalog from "./newsFootballLeagues.json";

export const FOOTBALL_NEWS_LEAGUES = catalog;
export const footballNewsLeague = (key) => catalog.find((row) => row.league === key || row.path === key);
export const footballNewsPath = (row) => `/football/${row.path}`;

export function footballCountryLabel(row, lang = "en") {
  if (row.country === "international") return "";
  if (row.country === "england") return lang === "sr" ? "Engleska" : "England";
  if (row.country === "scotland") return lang === "sr" ? "Škotska" : "Scotland";
  try { return new Intl.DisplayNames([lang === "sr" ? "sr-Latn" : lang], { type: "region" }).of(row.region); }
  catch { return row.country; }
}

export function footballNewsGroups(lang = "en") {
  const groups = new Map();
  for (const row of catalog) {
    if (!groups.has(row.country)) groups.set(row.country, {
      country: row.country, label: footballCountryLabel(row, lang), leagues: [],
    });
    groups.get(row.country).leagues.push(row);
  }
  return [...groups.values()].sort((a, b) => a.country === "international" ? -1
    : b.country === "international" ? 1 : a.label.localeCompare(b.label, lang));
}

export function leagueNewsRows(rows, league) {
  // Never fill a quiet competition page with stories from another league.
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    row.sport === "football" && row.league === league);
}
