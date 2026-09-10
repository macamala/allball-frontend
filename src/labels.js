export const SPORT_LABELS = {
  football: "Football",
  basketball: "Basketball",
  tennis: "Tennis",
  motorsport: "Motorsport",
};

export const COUNTRY_LABELS = {
  england: "England",
  spain: "Spain",
  italy: "Italy",
  germany: "Germany",
  france: "France",
  netherlands: "Netherlands",
  portugal: "Portugal",
  belgium: "Belgium",
  turkey: "Turkey",
  greece: "Greece",
  scotland: "Scotland",
  switzerland: "Switzerland",
  croatia: "Croatia",
  serbia: "Serbia",
  poland: "Poland",
  "czech-republic": "Czech Republic",
  usa: "USA",
  brazil: "Brazil",
  argentina: "Argentina",
  international: "International",
  europe: "Europe",
  global: "International",
};

export const COMPETITION_LABELS = {
  "england-premier-league": "Premier League",
  "england-championship": "Championship",
  "spain-la-liga": "La Liga",
  "spain-la-liga-2": "La Liga 2",
  "italy-serie-a": "Serie A",
  "italy-serie-b": "Serie B",
  "germany-bundesliga": "Bundesliga",
  "germany-2-bundesliga": "2. Bundesliga",
  "france-ligue-1": "Ligue 1",
  "france-ligue-2": "Ligue 2",
  "netherlands-eredivisie": "Eredivisie",
  "portugal-primeira-liga": "Primeira Liga",
  "belgium-pro-league": "Belgian Pro League",
  "turkey-super-lig": "Süper Lig",
  "greece-super-league": "Super League Greece",
  "scotland-premiership": "Scottish Premiership",
  "switzerland-super-league": "Swiss Super League",
  "croatia-hnl": "HNL",
  "serbia-superliga": "Mozzart Bet SuperLiga",
  "poland-ekstraklasa": "Ekstraklasa",
  "czech-first-league": "Czech First League",
  usa: "USA",
  "usa-mls": "MLS",
  "brazil-serie-a": "Brasileirão",
  "argentina-liga-profesional": "Liga Profesional",
  "uefa-champions-league": "UEFA Champions League",
  "uefa-europa-league": "Europa League",
  "uefa-conference-league": "Conference League",
  "fifa-world-cup": "World Cup",
  "uefa-euro": "European Championship",
  nba: "NBA",
  euroleague: "EuroLeague",
  "ncaa-basketball": "NCAA Basketball",
  "liga-acb": "Liga ACB",
  "us-open": "US Open",
  wimbledon: "Wimbledon",
  "roland-garros": "Roland Garros",
  "atp-tour": "ATP Tour",
  "formula-1": "Formula 1",
  "football-international": "International",
  "basketball-international": "International",
  "tennis-international": "Tennis",
  "motorsport-international": "Motorsport",
};

function titleCaseSlug(value) {
  if (!value) return "";
  return String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function sportLabel(value, fallback) {
  return fallback || SPORT_LABELS[value] || titleCaseSlug(value);
}

export function countryLabel(value, fallback) {
  return fallback || COUNTRY_LABELS[value] || titleCaseSlug(value);
}

export function competitionLabel(value, fallback) {
  return fallback || COMPETITION_LABELS[value] || titleCaseSlug(value);
}

export function articleDate(article) {
  const raw = article?.published_at || article?.created_at;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const CANONICAL_SITE = "https://ninkosports.com";
