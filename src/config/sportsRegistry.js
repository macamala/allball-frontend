/** Client copy of the NinkoSports Sports Registry.

Backend `sports_registry` is authoritative. This fallback keeps routing and
the Sports Directory working when `/registry/sports` has not loaded yet.
Adding a sport later should not require new React routes.
*/

export const REGISTRY_VERSION = "1.0.0";

export const EVENT_MODELS = [
  "team_match",
  "individual_match",
  "combat",
  "motorsport_race",
  "racing",
  "tournament",
  "esports_match",
];

export const CATEGORY_ORDER = [
  "team",
  "racket",
  "combat",
  "motorsport",
  "racing",
  "esports",
  "individual",
  "other",
];

export const CATEGORY_I18N = {
  team: "directory.team",
  racket: "directory.racket",
  combat: "directory.combat",
  motorsport: "directory.motorsport",
  racing: "directory.racing",
  esports: "directory.esports",
  individual: "directory.individual",
  other: "directory.other",
};

const FLAT_PATHS = new Set([
  "football",
  "basketball",
  "tennis",
  "motorsport",
  "american-football",
  "ice-hockey",
  "baseball",
  "rugby",
  "cricket",
  "volleyball",
  "handball",
  "golf",
  "boxing",
  "mma",
  "cycling",
  "snooker",
]);

export const SPORT_SLUG_ALIASES = {
  "rugby-union": "rugby",
  afl: "australian-rules",
  efootball: "ea-sports-fc",
  "ea-fc": "ea-sports-fc",
  cs2: "counter-strike",
  lol: "league-of-legends",
};

function pathFor(slug, navGroup) {
  if (FLAT_PATHS.has(slug) || navGroup === "main") return `/${slug}`;
  return `/sports/${slug}`;
}

function sport(partial) {
  const navGroup = partial.nav_group || "other";
  return {
    id: partial.slug,
    slug: partial.slug,
    name: partial.name,
    short_name: partial.short_name || partial.name,
    category: partial.category,
    event_model: partial.event_model,
    participant_type: partial.participant_type || "team",
    country_based: Boolean(partial.country_based),
    supports_draw: Boolean(partial.supports_draw),
    supports_live: partial.supports_live !== false,
    supports_standings: Boolean(partial.supports_standings),
    supports_rankings: Boolean(partial.supports_rankings),
    supports_predictions: Boolean(partial.supports_predictions),
    supports_odds: false,
    supports_news: partial.supports_news !== false,
    active: partial.active !== false,
    display_priority: partial.display_priority ?? 200,
    nav_group: navGroup,
    path: pathFor(partial.slug, navGroup),
    parent_id: partial.parent_id || null,
    followable: partial.followable !== false,
    directory_visible: partial.directory_visible !== false,
    live_filter: Boolean(partial.live_filter),
    esports_kind: partial.esports_kind || null,
    leagues: partial.leagues || [],
  };
}

export const FALLBACK_SPORTS = [
  sport({ slug: "football", name: "Football", category: "team", event_model: "team_match", supports_draw: true, supports_standings: true, supports_predictions: true, display_priority: 10, nav_group: "main", live_filter: true }),
  sport({ slug: "basketball", name: "Basketball", category: "team", event_model: "team_match", supports_standings: true, supports_predictions: true, display_priority: 20, nav_group: "main", live_filter: true }),
  sport({ slug: "tennis", name: "Tennis", category: "racket", event_model: "individual_match", participant_type: "person", supports_predictions: true, supports_rankings: true, display_priority: 30, nav_group: "main", live_filter: true, directory_visible: false }),
  sport({ slug: "motorsport", name: "Motorsport", category: "motorsport", event_model: "motorsport_race", participant_type: "driver", supports_standings: true, display_priority: 40, nav_group: "main", live_filter: true, directory_visible: false }),
  sport({ slug: "american-football", name: "American Football", category: "team", event_model: "team_match", supports_standings: true, display_priority: 110 }),
  sport({ slug: "ice-hockey", name: "Ice Hockey", category: "team", event_model: "team_match", supports_draw: true, supports_standings: true, display_priority: 120 }),
  sport({ slug: "baseball", name: "Baseball", category: "team", event_model: "team_match", supports_standings: true, display_priority: 130 }),
  sport({ slug: "rugby", name: "Rugby Union", short_name: "Rugby", category: "team", event_model: "team_match", supports_draw: true, supports_standings: true, display_priority: 140 }),
  sport({ slug: "rugby-league", name: "Rugby League", category: "team", event_model: "team_match", supports_standings: true, display_priority: 141 }),
  sport({ slug: "cricket", name: "Cricket", category: "team", event_model: "team_match", supports_draw: true, supports_standings: true, display_priority: 150 }),
  sport({ slug: "volleyball", name: "Volleyball", category: "team", event_model: "team_match", supports_standings: true, display_priority: 160 }),
  sport({ slug: "handball", name: "Handball", category: "team", event_model: "team_match", supports_draw: true, supports_standings: true, display_priority: 170 }),
  sport({ slug: "futsal", name: "Futsal", category: "team", event_model: "team_match", supports_draw: true, supports_standings: true, display_priority: 180 }),
  sport({ slug: "water-polo", name: "Water Polo", category: "team", event_model: "team_match", supports_draw: true, supports_standings: true, display_priority: 190 }),
  sport({ slug: "field-hockey", name: "Field Hockey", category: "team", event_model: "team_match", supports_draw: true, supports_standings: true, display_priority: 200 }),
  sport({ slug: "australian-rules", name: "Australian Rules", short_name: "AFL", category: "team", event_model: "team_match", supports_standings: true, display_priority: 210 }),
  sport({ slug: "netball", name: "Netball", category: "team", event_model: "team_match", supports_standings: true, display_priority: 220 }),
  sport({ slug: "lacrosse", name: "Lacrosse", category: "team", event_model: "team_match", supports_standings: true, display_priority: 230 }),
  sport({ slug: "table-tennis", name: "Table Tennis", category: "racket", event_model: "individual_match", participant_type: "person", supports_rankings: true, display_priority: 310 }),
  sport({ slug: "badminton", name: "Badminton", category: "racket", event_model: "individual_match", participant_type: "person", supports_rankings: true, display_priority: 320 }),
  sport({ slug: "snooker", name: "Snooker", category: "racket", event_model: "individual_match", participant_type: "person", supports_rankings: true, display_priority: 330 }),
  sport({ slug: "darts", name: "Darts", category: "racket", event_model: "individual_match", participant_type: "person", supports_rankings: true, display_priority: 340 }),
  sport({ slug: "boxing", name: "Boxing", category: "combat", event_model: "combat", participant_type: "fighter", supports_rankings: true, display_priority: 410 }),
  sport({ slug: "mma", name: "MMA", category: "combat", event_model: "combat", participant_type: "fighter", supports_rankings: true, display_priority: 420 }),
  sport({ slug: "horse-racing", name: "Horse Racing", category: "racing", event_model: "racing", participant_type: "runner", country_based: true, display_priority: 510 }),
  sport({ slug: "greyhound-racing", name: "Greyhound Racing", category: "racing", event_model: "racing", participant_type: "runner", country_based: true, display_priority: 520 }),
  sport({ slug: "harness-racing", name: "Harness Racing", category: "racing", event_model: "racing", participant_type: "runner", country_based: true, display_priority: 530 }),
  sport({ slug: "golf", name: "Golf", category: "individual", event_model: "tournament", participant_type: "person", supports_rankings: true, display_priority: 610 }),
  sport({ slug: "cycling", name: "Cycling", category: "individual", event_model: "tournament", participant_type: "person", supports_rankings: true, display_priority: 620 }),
  sport({ slug: "athletics", name: "Athletics", category: "individual", event_model: "tournament", participant_type: "person", supports_rankings: true, display_priority: 630 }),
  sport({ slug: "swimming", name: "Swimming", category: "individual", event_model: "tournament", participant_type: "person", supports_rankings: true, display_priority: 640 }),
  sport({ slug: "winter-sports", name: "Winter Sports", category: "individual", event_model: "tournament", participant_type: "mixed", supports_rankings: true, display_priority: 650 }),
  sport({ slug: "esports", name: "Esports", category: "esports", event_model: "esports_match", participant_type: "mixed", display_priority: 700 }),
  sport({ slug: "ea-sports-fc", name: "EA Sports FC", short_name: "EA FC", category: "esports", event_model: "esports_match", parent_id: "esports", esports_kind: "simulation", display_priority: 710 }),
  sport({ slug: "counter-strike", name: "Counter-Strike", category: "esports", event_model: "esports_match", parent_id: "esports", esports_kind: "competitive", display_priority: 720 }),
  sport({ slug: "league-of-legends", name: "League of Legends", category: "esports", event_model: "esports_match", parent_id: "esports", esports_kind: "competitive", display_priority: 730 }),
  sport({ slug: "dota-2", name: "Dota 2", category: "esports", event_model: "esports_match", parent_id: "esports", esports_kind: "competitive", display_priority: 740 }),
  sport({ slug: "valorant", name: "Valorant", category: "esports", event_model: "esports_match", parent_id: "esports", esports_kind: "competitive", display_priority: 750 }),
  sport({ slug: "call-of-duty", name: "Call of Duty", category: "esports", event_model: "esports_match", parent_id: "esports", esports_kind: "competitive", display_priority: 760 }),
  sport({ slug: "overwatch", name: "Overwatch", category: "esports", event_model: "esports_match", parent_id: "esports", esports_kind: "competitive", display_priority: 770 }),
  sport({ slug: "rocket-league", name: "Rocket League", category: "esports", event_model: "esports_match", parent_id: "esports", esports_kind: "competitive", display_priority: 780 }),
];

export const MOTORSPORT_SERIES = [
  { slug: "formula-1", name: "Formula 1", path: "/motorsport/formula-1" },
  { slug: "formula-2", name: "Formula 2", path: "/motorsport/formula-2" },
  { slug: "formula-3", name: "Formula 3", path: "/motorsport/formula-3" },
  { slug: "motogp", name: "MotoGP", path: "/motorsport/motogp" },
  { slug: "moto2", name: "Moto2", path: "/motorsport/moto2" },
  { slug: "moto3", name: "Moto3", path: "/motorsport/moto3" },
  { slug: "nascar", name: "NASCAR", path: "/motorsport/nascar" },
  { slug: "indycar", name: "IndyCar", path: "/motorsport/indycar" },
  { slug: "wec", name: "WEC", path: "/motorsport/wec" },
  { slug: "wrc", name: "WRC", path: "/motorsport/wrc" },
  { slug: "formula-e", name: "Formula E", path: "/motorsport/formula-e" },
  { slug: "supercars", name: "Supercars", path: "/motorsport/supercars" },
];

let remoteSports = [];
let remoteSeries = [];

export function hydrateRegistry(payload) {
  const rows = payload?.sports || [];
  if (Array.isArray(rows) && rows.length) {
    remoteSports = rows.map((row) => normalizeRemoteSport(row));
  }
  if (Array.isArray(payload?.motorsport_series) && payload.motorsport_series.length) {
    remoteSeries = payload.motorsport_series.map((row) => ({
      slug: row.slug || row.competition_id,
      name: row.name || row.official_name,
      path: row.path || `/motorsport/${row.slug || row.competition_id}`,
    }));
  }
}

function normalizeRemoteSport(row) {
  const slug = row.slug || row.sport || row.id;
  const navGroup = row.group || row.nav_group || "other";
  return {
    ...sport({
      slug,
      name: row.name || row.label || slug,
      short_name: row.short_name,
      category: row.category || "other",
      event_model: row.event_model || "team_match",
      participant_type: row.participant_type,
      country_based: row.country_based,
      supports_draw: row.supports_draw,
      supports_live: row.supports_live,
      supports_standings: row.supports_standings,
      supports_rankings: row.supports_rankings,
      supports_predictions: row.supports_predictions,
      supports_news: row.supports_news,
      display_priority: row.display_priority,
      nav_group: navGroup,
      parent_id: row.parent_id,
      followable: row.followable,
      directory_visible: row.directory_visible,
      live_filter: row.live_filter,
      esports_kind: row.esports_kind,
    }),
    article_count: Number(row.article_count || 0),
    path: row.path || pathFor(slug, navGroup),
  };
}

export function canonicalSportSlug(value) {
  if (!value) return "";
  const raw = String(value).trim().toLowerCase();
  if (raw === "other" || raw === "other-sports") return "other";
  return SPORT_SLUG_ALIASES[raw] || raw;
}

export function allRegistrySports() {
  const bySlug = new Map();
  FALLBACK_SPORTS.forEach((row) => bySlug.set(row.slug, row));
  remoteSports.forEach((row) => {
    bySlug.set(row.slug, { ...bySlug.get(row.slug), ...row });
  });
  return [...bySlug.values()].sort(
    (a, b) => (a.display_priority || 999) - (b.display_priority || 999)
  );
}

export function getRegistrySport(slug) {
  const key = canonicalSportSlug(slug);
  if (!key || key === "other") return null;
  return allRegistrySports().find((row) => row.slug === key) || null;
}

export function directorySports() {
  return allRegistrySports().filter(
    (row) =>
      row.active !== false &&
      row.nav_group !== "main" &&
      row.directory_visible !== false
  );
}

export function followableRegistrySports() {
  return allRegistrySports().filter((row) => row.active !== false && row.followable);
}

export function predictionRegistrySports() {
  return allRegistrySports().filter((row) => row.supports_predictions);
}

export function liveFilterSports() {
  return allRegistrySports().filter((row) => row.live_filter);
}

export function scoreboardSports() {
  const rows = allRegistrySports().filter(
    (row) => row.active !== false && row.supports_live !== false && !row.parent_id
  );
  if (rows.length) return rows;
  return liveFilterSports();
}

export function motorsportSeries() {
  return remoteSeries.length ? remoteSeries : MOTORSPORT_SERIES;
}

export function groupedDirectorySports() {
  const groups = [];
  const sports = directorySports();
  CATEGORY_ORDER.forEach((category) => {
    const items = sports.filter((row) => row.category === category);
    if (!items.length) return;
    groups.push({ category, items });
  });
  return groups;
}

export function toSportConfig(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    label: row.name || row.label,
    path: row.path,
    leagues: row.leagues || [],
    category: row.category,
    event_model: row.event_model,
    supports_predictions: Boolean(row.supports_predictions),
    supports_live: row.supports_live !== false,
    followable: row.followable !== false,
  };
}

export function predictionMarketForSport(slug) {
  const row = getRegistrySport(slug);
  if (!row || !row.supports_predictions) return null;
  if (row.event_model === "team_match" && row.supports_draw) return "1x2";
  if (["team_match", "individual_match", "combat", "esports_match"].includes(row.event_model)) {
    return "winner";
  }
  return null;
}
