import { competitionLabel, sportLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import {
  directorySports,
  getRegistrySport,
  toSportConfig,
} from "./sportsRegistry.js";

export function scopedCompetitionId(sportSlug, competitionKey) {
  if (!competitionKey) return "";
  if (String(competitionKey).includes(":")) return competitionKey;
  const sport = sportSlug || "football";
  return `${sport}:${competitionKey}`;
}

export function parseScopedCompetition(value) {
  if (!value) return { sport: "", competition: "" };
  const raw = String(value);
  if (raw.includes(":")) {
    const [sport, competition] = raw.split(":", 2);
    return { sport, competition };
  }
  return { sport: "", competition: raw };
}

export const MAIN_SPORTS = [
  {
    slug: "football",
    label: "Football",
    path: "/football",
    leagues: [
      { path: "premier-league", league: "england-premier-league", label: "Premier League" },
      { path: "champions-league", league: "uefa-champions-league", label: "UEFA Champions League" },
      { path: "la-liga", league: "spain-la-liga", label: "La Liga" },
      { path: "serie-a", league: "italy-serie-a", label: "Serie A" },
      { path: "bundesliga", league: "germany-bundesliga", label: "Bundesliga" },
      { path: "ligue-1", league: "france-ligue-1", label: "Ligue 1" },
      { path: "europa-league", league: "uefa-europa-league", label: "Europa League" },
      { path: "conference-league", league: "uefa-conference-league", label: "Conference League" },
      { path: "international", league: "football-international", label: "International" },
      { path: "other-leagues", league: null, label: "Other Leagues", catchAll: true },
    ],
  },
  {
    slug: "basketball",
    label: "Basketball",
    path: "/basketball",
    leagues: [
      { path: "nba", league: "nba", label: "NBA" },
      { path: "euroleague", league: "euroleague", label: "EuroLeague" },
      { path: "ncaa", league: "ncaa-basketball", label: "NCAA" },
      { path: "international", league: "basketball-international", label: "International" },
      { path: "other-leagues", league: null, label: "Other Leagues", catchAll: true },
    ],
  },
  {
    slug: "tennis",
    label: "Tennis",
    path: "/tennis",
    leagues: [
      { path: "us-open", league: "us-open", label: "US Open" },
      { path: "wimbledon", league: "wimbledon", label: "Wimbledon" },
      { path: "roland-garros", league: "roland-garros", label: "Roland Garros" },
      { path: "atp-tour", league: "atp-tour", label: "ATP Tour" },
      { path: "international", league: "tennis-international", label: "International" },
    ],
  },
  {
    slug: "motorsport",
    label: "Motorsport",
    path: "/motorsport",
    leagues: [
      { path: "formula-1", league: "formula-1", label: "Formula 1" },
      { path: "international", league: "motorsport-international", label: "International" },
    ],
  },
];

export const OTHER_SPORTS = {
  slug: "other",
  label: "Other Sports",
  path: "/other-sports",
  leagues: [],
};

export const DIRECTORY_SPORTS = directorySports().map((item) => ({
  slug: item.slug,
  label: item.name,
  path: item.path,
  category: item.category,
}));

export function getPrimaryNav(t) {
  return [
    { label: t("nav.home"), path: "/" },
    ...MAIN_SPORTS.map((sport) => ({
      label: t(sportI18nKey(sport.slug) || "sport.label"),
      path: sport.path,
      children: sport.leagues.map((league) => ({
        label: league.catchAll
          ? t("otherLeagues")
          : league.path === "international"
            ? t("international")
            : league.label,
        path: `${sport.path}/${league.path}`,
      })),
    })),
    { label: t("sport.other"), path: "/other-sports" },
    { label: t("predictions"), path: "/predictions" },
    { label: t("liveScores"), path: "/live-scores" },
  ];
}

export function getMobileBottomNav(t) {
  return [
    { id: "home", label: t("nav.home"), path: "/", end: true, icon: "home" },
    { id: "football", label: t("sport.football"), path: "/football", icon: "football" },
    { id: "basketball", label: t("sport.basketball"), path: "/basketball", icon: "basketball" },
    { id: "predictions", label: t("predictions"), path: "/predictions", icon: "predictions" },
    { id: "live", label: t("nav.live"), path: "/live-scores", icon: "live" },
    { id: "tennis", label: t("sport.tennis"), path: "/tennis", icon: "tennis" },
    { id: "motorsport", label: t("sport.motorsport"), path: "/motorsport", icon: "motorsport" },
    { id: "other", label: t("sport.other"), path: "/other-sports", icon: "other" },
    { id: "more", label: t("nav.more"), more: true, icon: "more" },
  ];
}

export const PRIMARY_NAV = getPrimaryNav((key) => {
  const fallback = {
    "nav.home": "Home",
    "sport.football": "Football",
    "sport.basketball": "Basketball",
    "sport.tennis": "Tennis",
    "sport.motorsport": "Motorsport",
    "sport.other": "Other Sports",
    liveScores: "Live Scores",
    predictions: "Predictions",
    international: "International",
    otherLeagues: "Other Leagues",
    "sport.label": "Sport",
  };
  return fallback[key] || key;
});

export function getSport(slug) {
  if (slug === "other" || slug === "other-sports") return OTHER_SPORTS;
  const main = MAIN_SPORTS.find((item) => item.slug === slug);
  if (main) return main;
  const registry = getRegistrySport(slug);
  if (registry) return toSportConfig(registry);
  return null;
}

export function featuredLeagueKeys(sport) {
  const config = getSport(sport);
  if (!config) return [];
  return config.leagues.filter((item) => item.league).map((item) => item.league);
}

export function resolveLeague(sportSlug, leagueSlug) {
  const sport = getSport(sportSlug);
  if (!sport) {
    return {
      path: leagueSlug,
      league: leagueSlug,
      label: competitionLabel(leagueSlug),
      catchAll: false,
    };
  }
  const fromNav = sport.leagues.find(
    (item) => item.path === leagueSlug || item.league === leagueSlug
  );
  if (fromNav) return fromNav;
  return {
    path: leagueSlug,
    league: leagueSlug,
    label: competitionLabel(leagueSlug),
    catchAll: false,
  };
}

export function sportPath(slug) {
  if (slug === "other") return "/other-sports";
  const sport = getSport(slug);
  return sport?.path || `/${slug}`;
}

export function guessSportFromLeague(league) {
  const raw = String(league || "");
  if (raw.includes(":")) return raw.split(":")[0];
  const key = raw;
  for (const sport of MAIN_SPORTS) {
    if (sport.leagues.some((item) => item.league === key)) return sport.slug;
  }
  return "football";
}

export function leaguePath(sportSlug, leagueKey) {
  const parsed = parseScopedCompetition(leagueKey);
  const sport = getSport(sportSlug || parsed.sport);
  const key = parsed.competition || leagueKey;
  if (!sport || !key) return sportPath(sportSlug || parsed.sport);
  const match = sport.leagues.find((item) => item.league === key);
  if (match) return `${sport.path}/${match.path}`;
  return `${sportPath(sport.slug)}/${key}`;
}

export function displaySport(slug, fallback) {
  return sportLabel(slug, fallback);
}
