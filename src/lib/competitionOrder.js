/** Editorial ordering only: never combine fixture identities or group tables. */
import { scopedCompetitionId } from "../config/sports.js";
import { getRegistrySport } from "../config/sportsRegistry.js";

const PRIORITIES = {
  "fifa-world-cup": 10, "uefa-euro": 20, "uefa-champions-league": 30,
  "uefa-nations-league": 40, "uefa-europa-league": 50, "uefa-conference-league": 60,
  "copa-america": 70, "copa-libertadores": 80, "concacaf-nations-league": 90,
  "england-premier-league": 100, "spain-la-liga": 110, "italy-serie-a": 120,
  "germany-bundesliga": 130, "france-ligue-1": 140, "serbia-superliga": 150,
  "australia-a-league": 160, "portugal-primeira-liga": 170, "netherlands-eredivisie": 180,
  "brazil-serie-a": 190, "argentina-primera": 200, "mls": 210,
};
const KEY_ALIASES = {"premier-league":"england-premier-league", "la-liga":"spain-la-liga", "serie-a":"italy-serie-a", "bundesliga":"germany-bundesliga", "ligue-1":"france-ligue-1", "champions-league":"uefa-champions-league", "europa-league":"uefa-europa-league", "conference-league":"uefa-conference-league", "world-cup":"fifa-world-cup"};
export function competitionFamily(group = {}) {
  const event = group.events?.[0] || group;
  const key = group.key || event.competition_key || event.competition || "unknown";
  const sport = group.sport || event.sport || "unknown";
  if (sport !== "football") return `${sport}::${key}`;
  const label = String(event.group || event.competition_name || event.competition || group.competition || "").trim();
  // Confederations stay separate. English National League is NOT Nations League.
  if (/^UEFA Nations League(?:\s|$)/i.test(label) || key === "uefa-nations-league") return "football::uefa-nations-league";
  if (/^CONCACAF Nations League(?:\s|$)/i.test(label) || key === "concacaf-nations-league") return "football::concacaf-nations-league";
  return `football::${KEY_ALIASES[key] || key}`;
}
export function competitionPriority(group) {
  return PRIORITIES[competitionFamily(group).split("::")[1]] ?? 1000;
}
export function orderCompetitionGroups(groups, favorites = {}) {
  const leagues = favorites.leagues || [], sports = favorites.sports || [];
  const buckets = new Map();
  for (const group of groups) {
    const family = competitionFamily(group);
    if (!buckets.has(family)) buckets.set(family, []);
    buckets.get(family).push(group);
  }
  const followed = group => leagues.includes(group.key) || leagues.includes(scopedCompetitionId(group.sport, group.key));
  const rank = family => family.some(followed) ? 0 : sports.includes(family[0].sport) ? 1 : 2;
  const families = [...buckets.entries()].sort(([ak,a],[bk,b]) =>
    rank(a)-rank(b) ||
    (getRegistrySport(a[0].sport)?.display_priority ?? 999)-(getRegistrySport(b[0].sport)?.display_priority ?? 999) ||
    competitionPriority(a[0])-competitionPriority(b[0]) ||
    Number(b.some(g=>g.hasLive))-Number(a.some(g=>g.hasLive)) ||
    String(a[0].geography_label || a[0].country_id || "").localeCompare(String(b[0].geography_label || b[0].country_id || "")) || ak.localeCompare(bk));
  return families.flatMap(([,family]) => [...family].sort((a,b) =>
    String(a.group || a.competition || "").localeCompare(String(b.group || b.competition || ""), "en", {numeric:true}) || String(a.identity_key).localeCompare(String(b.identity_key))));
}
