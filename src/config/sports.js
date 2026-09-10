import { competitionLabel, sportLabel } from "../labels.js";

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

export const PRIMARY_NAV = [
  { label: "Home", path: "/" },
  ...MAIN_SPORTS.map((sport) => ({
    label: sport.label,
    path: sport.path,
    children: sport.leagues.map((league) => ({
      label: league.label,
      path: `${sport.path}/${league.path}`,
    })),
  })),
  { label: "Other Sports", path: "/other-sports" },
  { label: "Live Scores", path: "/live-scores" },
];

export function getSport(slug) {
  if (slug === "other" || slug === "other-sports") return OTHER_SPORTS;
  return MAIN_SPORTS.find((item) => item.slug === slug) || null;
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

export function leaguePath(sportSlug, leagueKey) {
  const sport = getSport(sportSlug);
  if (!sport || !leagueKey) return sportPath(sportSlug);
  const match = sport.leagues.find((item) => item.league === leagueKey);
  if (match) return `${sport.path}/${match.path}`;
  return `${sportPath(sportSlug)}/${leagueKey}`;
}

export function displaySport(slug, fallback) {
  return sportLabel(slug, fallback);
}
