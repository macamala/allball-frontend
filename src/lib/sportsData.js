/** Shared normalized sports-data helpers for Live Scores and Predictions.

Frontend never depends on a vendor response shape. Both ScoreMatch-style
rows and NormalizedEvent objects are mapped here.
*/

import { predictionMarketForSport } from "../config/sportsRegistry.js";
import { sanitizeParticipantName } from "./participantDisplay.js";

const INTERNAL_EVENT_KEYS = new Set([
  "provider",
  "provider_id",
  "field_sources",
  "source_event_ids",
  "source_kickoffs",
  "source_family",
  "source_fetch_time",
  "source_status",
  "source_timezone",
  "source_local_datetime",
  "source_event_updated_at",
  "source_competition_id",
  "source_competition_name",
  "source_season_id",
  "source_season_name",
  "sofascore_tournament_id",
  "sofascore_season_id",
  "resolution_method",
  "resolution_confidence",
  "quality_flags",
  "display_eligible",
  "obs_signature",
  "observed_at",
  "canonical_last_observed_at",
  "status_reconciliation",
  "timezone_resolution_method",
  "attribution",
  "collector",
]);

const LIVE_STATUSES = new Set(["live", "halftime", "break", "inplay", "ht"]);
const FINISHED_STATUSES = new Set([
  "finished",
  "ft",
  "final",
  "ended",
  "cancelled",
  "canceled",
  "abandoned",
  "walkover",
  "aet",
  "pen",
  "awarded",
]);
const UPCOMING_STATUSES = new Set([
  "scheduled",
  "not_started",
  "ns",
  "fixture",
  "postponed",
  "delayed",
  "tbd",
  "stale",
  "unknown",
  "status_unknown",
  "suspended",
]);

const FAMILY_TO_TYPE = {
  team_match: "TEAM_MATCH",
  individual_match: "HEAD_TO_HEAD",
  combat: "HEAD_TO_HEAD",
  racing: "RACE",
  motorsport_race: "RACE",
  stage_race: "RACE",
  tournament: "TOURNAMENT",
  esports_match: "TEAM_MATCH",
  individual: "MEET",
};

const MEET_SPORTS = new Set(["athletics", "swimming", "winter-sports"]);

export function participantName(side, options = {}) {
  if (!side) return "";
  if (typeof side === "string") return sanitizeParticipantName(side, options);
  return sanitizeParticipantName(side.display_name || side.name || "", {
    ...options,
    participantCountry: side.country_id || side.country,
  });
}

export function participantLogo(side) {
  if (!side || typeof side !== "object") return "";
  return (
    side.logo ||
    side.crest ||
    side.image ||
    side.badge ||
    side.team_logo ||
    side.teamLogo ||
    side.logo_url ||
    side.logoUrl ||
    ""
  );
}

function normalizeSide(raw, fallbackName, fallbackSlug, side, options = {}) {
  if (raw && typeof raw === "object") {
    const name = raw.name || fallbackName || "";
    const shown = sanitizeParticipantName(name, {
      ...options,
      participantCountry: raw.country_id || raw.country || raw.nationality,
    });
    return {
      id: raw.id || "",
      slug: raw.slug || fallbackSlug || "",
      name: shown || name,
      display_name: shown,
      side,
      logo: participantLogo(raw),
      country_id: raw.country_id || raw.country || raw.nationality || "",
      country_ids: Array.isArray(raw.country_ids) ? raw.country_ids.filter(Boolean) : [],
    };
  }
  const name = raw || fallbackName || "";
  const shown = sanitizeParticipantName(name, options);
  return {
    id: "",
    slug: fallbackSlug || "",
    name: shown || name,
    display_name: shown,
    side,
    logo: "",
    country_id: "",
    country_ids: [],
  };
}

export function eventShape(raw) {
  const explicit = String(raw?.event_type || "").toUpperCase();
  if (
    [
      "TEAM_MATCH",
      "HEAD_TO_HEAD",
      "RACE",
      "MEET",
      "TOURNAMENT",
      "BRACKET",
      "MULTI_EVENT_MEET",
    ].includes(explicit)
  ) {
    return explicit;
  }
  const family = String(raw?.event_family || "").toLowerCase();
  if (raw?.bracket) return "BRACKET";
  if (MEET_SPORTS.has(String(raw?.sport || "")) || family === "individual") {
    return Array.isArray(raw?.disciplines) ? "MULTI_EVENT_MEET" : "MEET";
  }
  if (family === "tournament" && MEET_SPORTS.has(String(raw?.sport || ""))) return "MEET";
  if (FAMILY_TO_TYPE[family]) return FAMILY_TO_TYPE[family];
  return "UNKNOWN";
}

const RACING_SPORTS = new Set(["horse-racing", "greyhound-racing", "harness-racing"]);

export function isRacingEvent(event) {
  const sport = event?.sport || "";
  const family = String(event?.event_family || "").toLowerCase();
  return family === "racing" || RACING_SPORTS.has(sport);
}

export function isLiveStatus(status, liveFlag) {
  const value = String(status || "").toLowerCase();
  if (LIVE_STATUSES.has(value)) return true;
  return false;
}

export function isConfirmedLive(event) {
  if (!event) return false;
  if (isRacingEvent(event)) return false;
  const liveClass = String(event.live_class || "").toUpperCase();
  if (liveClass === "STALE_LIVE" || liveClass === "RAPID_RESULT" || liveClass === "RESULTS_ONLY") {
    return false;
  }
  if (liveClass === "CONFIRMED_LIVE") return true;
  return isLiveStatus(event.status);
}

export function isFinishedStatus(status) {
  return FINISHED_STATUSES.has(String(status || "").toLowerCase());
}

export function isUpcomingStatus(status, liveFlag) {
  if (isLiveStatus(status, liveFlag) || isFinishedStatus(status)) return false;
  const raw = String(status || "").toLowerCase();
  return !raw || UPCOMING_STATUSES.has(raw);
}

export function eventStatusView(event) {
  if (isConfirmedLive(event)) return "live";
  if (isFinishedStatus(event?.status)) return "finished";
  return "upcoming";
}

export function matchesStatusView(event, view) {
  if (!view || view === "all") return true;
  return eventStatusView(event) === view;
}

export function statusCounts(events) {
  const counts = { all: 0, live: 0, upcoming: 0, finished: 0 };
  for (const event of events || []) {
    counts.all += 1;
    counts[eventStatusView(event)] += 1;
  }
  return counts;
}

export function dateKeyInTimeZone(iso, timeZone) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "undated";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "undated";
  return `${year}-${month}-${day}`;
}

export function publicEventSafe(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(publicEventSafe);
  const out = {};
  Object.entries(value).forEach(([key, item]) => {
    if (INTERNAL_EVENT_KEYS.has(key)) return;
    out[key] = publicEventSafe(item);
  });
  return out;
}

export function normalizeEvent(raw) {
  if (!raw) return null;
  const home = normalizeSide(raw.home, raw.home_team, raw.home_slug, "home", {
    sport: raw.sport,
    competitionCountry: raw.country_id,
  });
  const away = normalizeSide(raw.away, raw.away_team, raw.away_slug, "away", {
    sport: raw.sport,
    competitionCountry: raw.country_id,
  });
  const participantA =
    raw.participant_a && typeof raw.participant_a === "object"
      ? normalizeSide(raw.participant_a, "", "", "a")
      : { ...home, side: "a" };
  const participantB =
    raw.participant_b && typeof raw.participant_b === "object"
      ? normalizeSide(raw.participant_b, "", "", "b")
      : { ...away, side: "b" };
  const score =
    raw.score && typeof raw.score === "object"
      ? {
          home: raw.score.home ?? raw.home_score ?? null,
          away: raw.score.away ?? raw.away_score ?? null,
          period: raw.score.period || raw.period || null,
          minute: raw.score.minute || raw.minute || null,
          clock: raw.score.clock || null,
          set: raw.score.set || null,
          quarter: raw.score.quarter || null,
          runs: raw.score.runs ?? null,
          wickets: raw.score.wickets ?? null,
          hits: raw.score.hits ?? null,
          errors: raw.score.errors ?? null,
          sets: raw.score.sets || null,
          games: raw.score.games || null,
          inning: raw.score.inning ?? raw.inning ?? null,
          inning_half: raw.score.inning_half || raw.score.inning_state || null,
          outs: raw.score.outs ?? null,
        }
      : {
          home: raw.home_score ?? null,
          away: raw.away_score ?? null,
          period: raw.period || null,
          minute: raw.minute || null,
          clock: null,
          set: null,
          quarter: null,
          runs: null,
          wickets: null,
          sets: null,
          games: null,
          inning: raw.inning || null,
          inning_half: null,
          outs: null,
        };
  const status = raw.status || "scheduled";
  const live = isLiveStatus(status);
  return {
    id: String(raw.id || ""),
    sport: raw.sport || "",
    competition: raw.competition_name || raw.competition || raw.league || "",
    competition_key: raw.competition_key || raw.league || raw.competition || "",
    competition_name: raw.competition_name || raw.competition || "",
    geography_label: raw.geography_label || "",
    scope_type: raw.scope_type || "",
    season: raw.season || null,
    home,
    away,
    start_time: raw.start_time || raw.kickoff || null,
    status,
    score,
    venue: raw.venue || null,
    provider: null,
    provider_id: null,
    updated_at: raw.updated_at || null,
    live,
    event_family: raw.event_family || "",
    event_type: eventShape(raw),
    participant_a: participantA,
    participant_b: participantB,
    round: raw.round || raw.stage || null,
    stage: raw.stage || raw.round || null,
    group: raw.group || null,
    group_name: raw.group_name || null,
    country_id: raw.country_id || null,
    country_based: Boolean(raw.country_based),
    competition_logo: raw.competition_logo || raw.competition_image || "",
    start_precision: raw.start_precision || null,
    live_class: raw.live_class || null,
    start_date: raw.start_date || null,
    meeting_id: raw.meeting_id || null,
    race_number: raw.race_number || null,
    session_type: raw.session_type || null,
    series_id: raw.series_id || null,
    athletes: Array.isArray(raw.athletes) ? raw.athletes : null,
    classification: Array.isArray(raw.classification) ? raw.classification : null,
    runners: Array.isArray(raw.runners) ? raw.runners : null,
    leaderboard: Array.isArray(raw.leaderboard) ? raw.leaderboard : null,
    maps: Array.isArray(raw.maps) ? raw.maps : null,
    winner: raw.winner || null,
    tournament: raw.tournament || null,
    tournament_id: raw.tournament_id || null,
    tournament_name: raw.tournament_name || null,
    surface: raw.surface || null,
    category: raw.category || null,
    periods: raw.periods || raw.sets || null,
    best_of: raw.best_of || null,
    bracket: raw.bracket || null,
    result_type: raw.result_type || null,
    walkover: raw.walkover || null,
    forfeit: raw.forfeit || null,
    race_name: raw.race_name || null,
    disciplines: raw.disciplines || null,
    timezone: raw.timezone || null,
    game_id: raw.game_id || null,
    parent_sport_id: raw.parent_sport_id || null,
    lineups: raw.lineups ?? null,
    statistics: raw.statistics ?? null,
    incidents: raw.incidents ?? null,
    form: raw.form ?? null,
    attendance: raw.attendance ?? null,
    referee: raw.referee ?? null,
    innings: raw.innings ?? null,
    player_statistics: raw.player_statistics ?? null,
    officials: raw.officials ?? null,
    standings_available: Boolean(raw.standings_available),
    timeline: raw.timeline ?? raw.incidents ?? null,
    sport_detail: raw.sport_detail ?? null,
    serving: raw.serving ?? raw.sport_detail?.serving ?? null,
    current_set: raw.current_set ?? raw.sport_detail?.current_set ?? null,
  };
}

export function scoreLine(event) {
  const score = event?.score || {};
  if (score.home == null || score.away == null) return "";
  return `${score.home}–${score.away}`;
}

export function missingScorePlaceholder() {
  return "–";
}

export function predictionMarket(sport) {
  if (sport === "football") return "1x2";
  if (sport === "basketball" || sport === "tennis") return "winner";
  return predictionMarketForSport(sport);
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return `${Math.round(Number(value))}%`;
}

export function outcomePercents(prediction, sport) {
  if (!prediction) return [];
  const market = prediction.market || predictionMarket(sport);
  const rows = [{ key: "home", value: prediction.home_win_pct }];
  if (market === "1x2") {
    rows.push({ key: "draw", value: prediction.draw_pct });
  }
  rows.push({ key: "away", value: prediction.away_win_pct });
  return rows.filter((row) => row.value != null && !Number.isNaN(Number(row.value)));
}

export function displayConfidence(prediction) {
  const value = String(prediction?.confidence || "").toLowerCase();
  if (value === "low" || value === "medium" || value === "high") return value;
  return null;
}

export function visibleEvidence(prediction) {
  const list = prediction?.evidence;
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && item.type && (item.facts || item.label));
}

function startOfLocalDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function periodRange(period, now = new Date()) {
  const today = startOfLocalDay(now);
  if (period === "today") {
    return { from: today, to: endOfLocalDay(today) };
  }
  if (period === "tomorrow") {
    const tomorrow = addDays(today, 1);
    return { from: tomorrow, to: endOfLocalDay(tomorrow) };
  }
  if (period === "this-week") {
    const weekday = today.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const monday = addDays(today, mondayOffset);
    return { from: monday, to: endOfLocalDay(addDays(monday, 6)) };
  }
  return { from: today, to: endOfLocalDay(addDays(today, 6)) };
}

export function eventDateKey(event) {
  const raw = event?.start_time || event?.kickoff || "";
  if (!raw) return "undated";
  const prefix = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  if (prefix) return prefix[1];
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "undated";
  return date.toISOString().slice(0, 10);
}

export function addLocalDays(dateKey, days) {
  const [year, month, day] = String(dateKey)
    .split("-")
    .map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function localDayUtcBounds(dateKey) {
  const [year, month, day] = String(dateKey)
    .split("-")
    .map((part) => Number(part));
  const from = new Date(year, month - 1, day, 0, 0, 0, 0);
  const to = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { date_from: from.toISOString(), date_to: to.toISOString() };
}

export function rollingUtcBounds(now = new Date(), hoursBack = 12, hoursForward = 36) {
  const stamp = now instanceof Date ? now : new Date(now);
  const base = Number.isNaN(stamp.getTime()) ? new Date() : stamp;
  return {
    date_from: new Date(base.getTime() - hoursBack * 60 * 60 * 1000).toISOString(),
    date_to: new Date(base.getTime() + hoursForward * 60 * 60 * 1000).toISOString(),
  };
}

export function eventLocalDateKey(event) {
  if (event?.start_precision === "DATE_ONLY" && event?.start_date) {
    return String(event.start_date).slice(0, 10);
  }
  const raw = event?.start_time || event?.kickoff || "";
  if (!raw) return event?.start_date ? String(event.start_date).slice(0, 10) : "undated";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "undated";
  return isoDate(date);
}

export function formatEventTime(event, locale = "en-GB") {
  if (!event?.start_time) return "";
  if (event.start_precision === "DATE_ONLY" || event.start_precision === "UNKNOWN") return "";
  const date = new Date(event.start_time);
  if (Number.isNaN(date.getTime())) return "";
  if (event.start_precision !== "EXACT_TIME") {
    const utcMidnight =
      date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
    if (utcMidnight) return "";
  }
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatEventDateTime(event, locale = "en-GB") {
  if (!event?.start_time) return "";
  const date = new Date(event.start_time);
  if (Number.isNaN(date.getTime())) return "";
  if (event.start_precision === "DATE_ONLY" || event.start_precision === "UNKNOWN") {
    return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  }
  return date.toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function groupEventsByCompetition(events) {
  const groups = new Map();
  for (const event of events || []) {
    const key = event.competition_key || event.competition || "unknown";
    const sport = event.sport || "unknown";
    const displayCompetition = String(event.competition_name || event.competition || key || "").trim();
    const dotaTournamentIdentity =
      sport === "dota-2" &&
      key === "professional" &&
      displayCompetition &&
      displayCompetition.toLowerCase() !== "dota 2 professional"
        ? displayCompetition.toLowerCase().replace(/\s+/g, " ")
        : "";
    const footballGroup = sport === "football" ? String(event.group || "").trim() : "";
    const identityKey = footballGroup
      ? `${sport}::${key}::${footballGroup.toLowerCase()}`
      : dotaTournamentIdentity
        ? `${sport}::${key}::${dotaTournamentIdentity}`
        : `${sport}::${key}`;
    if (!groups.has(identityKey)) {
      groups.set(identityKey, {
        key,
        identity_key: identityKey,
        group: footballGroup || null,
        stage: event.stage || null,
        sport,
        competition: displayCompetition || key,
        country_id: event.country_id || null,
        geography_label: event.geography_label || null,
        scope_type: event.scope_type || null,
        series_id: event.series_id || null,
        country_based: Boolean(event.country_based),
        events: [],
      });
    }
    groups.get(identityKey).events.push(event);
  }
  for (const group of groups.values()) {
    group.events.sort((left, right) => {
      const leftStart = left.start_time || "";
      const rightStart = right.start_time || "";
      if (leftStart !== rightStart) return leftStart.localeCompare(rightStart);
      return String(left.id).localeCompare(String(right.id));
    });
    group.hasLive = group.events.some((item) => isConfirmedLive(item));
    group.earliest = group.events[0]?.start_time || "";
  }
  return [...groups.values()];
}

export function sportCounts(events) {
  const counts = {};
  for (const event of events || []) {
    const slug = event?.sport;
    if (!slug) continue;
    counts[slug] = (counts[slug] || 0) + 1;
  }
  return counts;
}

export function eventMatchesFavorite(event, favorites) {
  const sports = favorites?.sports || [];
  const leagues = favorites?.leagues || [];
  const teams = favorites?.teams || [];
  if (sports.includes(event.sport)) return true;
  const scoped = `${event.sport}:${event.competition_key}`;
  if (leagues.includes(scoped) || leagues.includes(event.competition_key)) return true;
  const keys = [
    event.home?.id,
    event.home?.slug,
    event.away?.id,
    event.away?.slug,
    event.participant_a?.id,
    event.participant_b?.id,
    event.id,
  ].filter(Boolean);
  return keys.some((key) => teams.includes(String(key)));
}

export function eventPath(eventId) {
  if (!eventId) return "/live-scores";
  return `/scores/event/${encodeURIComponent(eventId)}`;
}

function entityKey(entity, fallbackName = "") {
  return String(entity?.id || entity?.slug || fallbackName || entity?.name || entity?.display_name || "").trim();
}

export function teamProfilePath(side, event = {}, fallbackName = "") {
  const name = participantName(side, {
    sport: event?.sport,
    competitionCountry: event?.country_id,
  }) || fallbackName;
  const key = entityKey(side, name);
  if (!key) return "/live-scores";
  const search = new URLSearchParams();
  if (event?.sport) search.set("sport", event.sport);
  if (event?.competition_key) search.set("competition", event.competition_key);
  if (name) search.set("name", name);
  const qs = search.toString();
  return `/teams/${encodeURIComponent(key)}${qs ? `?${qs}` : ""}`;
}

export function playerProfilePath(player, event = {}, fallbackName = "") {
  const name = String(player?.display_name || player?.name || fallbackName || "").trim();
  const key = entityKey(player, name);
  if (!key) return eventPath(event?.id);
  const search = new URLSearchParams();
  if (name) search.set("name", name);
  if (event?.id) search.set("event_id", event.id);
  const qs = search.toString();
  return `/players/${encodeURIComponent(key)}${qs ? `?${qs}` : ""}`;
}

export function formatWeekdayLabel(dateKey, locale = "en-GB") {
  if (!dateKey || dateKey === "undated") return "";
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function groupEventsByDate(events, locale = "en-GB") {
  const groups = new Map();
  for (const event of events || []) {
    const key = eventDateKey(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, rows]) => ({
      date,
      label: formatWeekdayLabel(date, locale),
      events: rows,
    }));
}

export function eventInPeriod(event, period, now = new Date()) {
  const range = periodRange(period, now);
  const raw = event?.start_time || event?.kickoff;
  if (!raw) return false;
  const start = new Date(raw);
  if (Number.isNaN(start.getTime())) return false;
  return start >= range.from && start <= range.to;
}

export function browseCompetitions(sportConfig, providerCompetitions) {
  if (Array.isArray(providerCompetitions) && providerCompetitions.length) {
    return providerCompetitions.map((item) => ({
      path: item.path || item.slug || item.key,
      league: item.key || item.league || item.slug,
      label: item.label || item.name,
    }));
  }
  return (sportConfig?.leagues || []).filter((item) => item.league && !item.catchAll);
}

export function mergeEventPayload(payload, incomingRows) {
  const list = [...(payload?.events || [])];
  const index = new Map(list.map((row, i) => [row?.id, i]));
  for (const row of incomingRows || []) {
    if (!row?.id) continue;
    const at = index.get(row.id);
    if (at == null) {
      index.set(row.id, list.length);
      list.push(row);
      continue;
    }
    const current = list[at] || {};
    list[at] = {
      ...current,
      ...row,
      score: { ...(current.score || {}), ...(row.score || {}) },
    };
  }
  return { ...(payload || {}), events: list };
}

export function predictionPath(sportSlug, competitionSlug, eventId) {
  if (!sportSlug) return "/predictions";
  if (!competitionSlug) return `/predictions/${sportSlug}`;
  if (!eventId) return `/predictions/${sportSlug}/${competitionSlug}`;
  return `/predictions/${sportSlug}/${competitionSlug}/${encodeURIComponent(eventId)}`;
}
