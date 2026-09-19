/** Shared normalized sports-data helpers for Live Scores and Predictions.

Frontend never depends on a vendor response shape. Both ScoreMatch-style
rows and NormalizedEvent objects are mapped here.
*/

import { predictionMarketForSport } from "../config/sportsRegistry.js";

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
]);

const FAMILY_TO_TYPE = {
  team_match: "TEAM_MATCH",
  individual_match: "HEAD_TO_HEAD",
  combat: "HEAD_TO_HEAD",
  racing: "RACE",
  motorsport_race: "RACE",
  tournament: "TOURNAMENT",
  esports_match: "TEAM_MATCH",
};

export function participantName(side) {
  if (!side) return "";
  if (typeof side === "string") return side;
  return side.name || "";
}

export function participantLogo(side) {
  if (!side || typeof side !== "object") return "";
  return side.logo || side.crest || side.image || "";
}

function normalizeSide(raw, fallbackName, fallbackSlug, side) {
  if (raw && typeof raw === "object") {
    return {
      id: raw.id || "",
      slug: raw.slug || fallbackSlug || "",
      name: raw.name || fallbackName || "",
      side,
      logo: participantLogo(raw),
    };
  }
  return {
    id: "",
    slug: fallbackSlug || "",
    name: raw || fallbackName || "",
    side,
    logo: "",
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
  if (family === "racing" && (raw?.meeting_id || raw?.race_number)) return "MEET";
  if (family === "tournament" && raw?.bracket) return "BRACKET";
  return FAMILY_TO_TYPE[family] || "TEAM_MATCH";
}

export function isLiveStatus(status, liveFlag) {
  if (liveFlag) return true;
  return LIVE_STATUSES.has(String(status || "").toLowerCase());
}

export function isFinishedStatus(status) {
  return FINISHED_STATUSES.has(String(status || "").toLowerCase());
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
  const home = normalizeSide(raw.home, raw.home_team, raw.home_slug, "home");
  const away = normalizeSide(raw.away, raw.away_team, raw.away_slug, "away");
  const participantA =
    raw.participant_a && typeof raw.participant_a === "object"
      ? normalizeSide(raw.participant_a, "", "", "a")
      : home;
  const participantB =
    raw.participant_b && typeof raw.participant_b === "object"
      ? normalizeSide(raw.participant_b, "", "", "b")
      : away;
  const score =
    raw.score && typeof raw.score === "object"
      ? {
          home: raw.score.home ?? raw.home_score ?? null,
          away: raw.score.away ?? raw.away_score ?? null,
          period: raw.score.period || raw.period || null,
          minute: raw.score.minute || raw.minute || null,
          clock: raw.score.clock || null,
          set: raw.score.set || null,
        }
      : {
          home: raw.home_score ?? null,
          away: raw.away_score ?? null,
          period: raw.period || null,
          minute: raw.minute || null,
          clock: null,
          set: null,
        };
  const status = raw.status || (raw.live ? "live" : "scheduled");
  const live = isLiveStatus(status, raw.live);
  return {
    id: String(raw.id || ""),
    sport: raw.sport || "",
    competition: raw.competition || raw.league || "",
    competition_key: raw.competition_key || raw.league || raw.competition || "",
    season: raw.season || null,
    home: participantName(participantA) ? participantA : home,
    away: participantName(participantB) ? participantB : away,
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
    country_id: raw.country_id || null,
    start_precision: raw.start_precision || null,
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
  };
}

export function scoreLine(event) {
  const score = event?.score || {};
  if (score.home == null || score.away == null) return "";
  return `${score.home}–${score.away}`;
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
  if (event.start_precision === "DATE_ONLY") return "";
  const date = new Date(event.start_time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatEventDateTime(event, locale = "en-GB") {
  if (!event?.start_time) return "";
  const date = new Date(event.start_time);
  if (Number.isNaN(date.getTime())) return "";
  if (event.start_precision === "DATE_ONLY") {
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
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        sport: event.sport,
        competition: event.competition || key,
        country_id: event.country_id || null,
        events: [],
      });
    }
    groups.get(key).events.push(event);
  }
  return [...groups.values()];
}

export function eventPath(eventId) {
  if (!eventId) return "/live-scores";
  return `/scores/event/${encodeURIComponent(eventId)}`;
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

export function predictionPath(sportSlug, competitionSlug, eventId) {
  if (!sportSlug) return "/predictions";
  if (!competitionSlug) return `/predictions/${sportSlug}`;
  if (!eventId) return `/predictions/${sportSlug}/${competitionSlug}`;
  return `/predictions/${sportSlug}/${competitionSlug}/${encodeURIComponent(eventId)}`;
}
