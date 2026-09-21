import { getRegistrySport } from "../config/sportsRegistry.js";
import {
  isConfirmedLive,
  isFinishedStatus,
  isRacingEvent,
} from "./sportsData.js";
import { displayParticipantName } from "./participantDisplay.js";

export const RENDERERS = [
  "TEAM_MATCH",
  "HEAD_TO_HEAD",
  "RACE",
  "MEET",
  "MULTI_EVENT_MEET",
  "TOURNAMENT",
  "BRACKET",
];

const MEET_SPORTS = new Set(["athletics", "swimming", "winter-sports"]);
const FT_SPORTS = new Set(["football", "futsal"]);

const FAMILY_RENDERER = {
  team_match: "TEAM_MATCH",
  individual_match: "HEAD_TO_HEAD",
  combat: "HEAD_TO_HEAD",
  motorsport_race: "RACE",
  racing: "RACE",
  stage_race: "RACE",
  tournament: "TOURNAMENT",
  esports_match: "TEAM_MATCH",
  individual: "MEET",
};

const MODEL_FAMILY = {
  team_match: "team_match",
  individual_match: "individual_match",
  combat: "combat",
  motorsport_race: "motorsport_race",
  racing: "racing",
  tournament: "tournament",
  esports_match: "esports_match",
};

function sportRecord(sport) {
  return getRegistrySport(sport) || null;
}

export function scoreCell(value) {
  if (value == null || value === "") return null;
  return value;
}

export function formatPairScore(home, away, empty = "–") {
  const left = scoreCell(home);
  const right = scoreCell(away);
  if (left == null && right == null) return empty;
  if (left == null || right == null) {
    return `${left == null ? empty : left} ${empty} ${right == null ? empty : right}`;
  }
  return `${left} – ${right}`;
}

export function hasPairScore(event) {
  const score = event?.score || {};
  return scoreCell(score.home) != null && scoreCell(score.away) != null;
}

export function periodRows(event) {
  const score = event?.score || {};
  const periods = event?.periods || score.sets || score.periods || score.games;
  if (!Array.isArray(periods) || !periods.length) return [];
  return periods
    .map((row) => {
      if (row == null) return null;
      if (typeof row === "object") {
        const home = scoreCell(row.home ?? row.a ?? row[0]);
        const away = scoreCell(row.away ?? row.b ?? row[1]);
        if (home == null && away == null) return null;
        return { home, away };
      }
      return null;
    })
    .filter(Boolean);
}

export function rendererForEvent(event) {
  if (!event) return "TEAM_MATCH";
  const explicit = String(event.event_type || "").toUpperCase();
  if (RENDERERS.includes(explicit)) return explicit;
  const sport = event.sport || "";
  const registry = sportRecord(sport);
  const family = String(event.event_family || "").toLowerCase();
  const model = registry?.event_model || MODEL_FAMILY[family] || "";

  if (event.bracket) return "BRACKET";
  if (family === "esports_match" && event.bracket) return "BRACKET";

  if (MEET_SPORTS.has(sport) || family === "individual") {
    if (Array.isArray(event.disciplines) || event.event_type === "MULTI_EVENT_MEET") {
      return "MULTI_EVENT_MEET";
    }
    return "MEET";
  }

  if (family === "stage_race") return "RACE";
  if (FAMILY_RENDERER[family]) {
    if (family === "tournament" && MEET_SPORTS.has(sport)) return "MEET";
    if (family === "esports_match" && event.best_of && event.bracket) return "BRACKET";
    return FAMILY_RENDERER[family];
  }
  if (model && FAMILY_RENDERER[MODEL_FAMILY[model] || model]) {
    const mapped = FAMILY_RENDERER[MODEL_FAMILY[model] || model];
    if (mapped === "TOURNAMENT" && MEET_SPORTS.has(sport)) return "MEET";
    return mapped;
  }
  return "UNKNOWN";
}

export function unknownRenderer(event) {
  const kind = rendererForEvent(event);
  return kind === "UNKNOWN" ? kind : null;
}

export function finishedLabel(event, t) {
  const sport = event?.sport || "";
  if (FT_SPORTS.has(sport)) return t("live.ft");
  if (sport === "motorsport" || event?.event_family === "motorsport_race") {
    return t("live.raceFinished");
  }
  if (["horse-racing", "greyhound-racing", "harness-racing"].includes(sport)) {
    return t("live.raceFinished");
  }
  return t("live.final");
}

const MINUTE_SPORTS = new Set(["football", "futsal", "rugby", "rugby-league"]);
const QUARTER_SPORTS = new Set(["basketball", "netball", "australian-rules"]);
const PERIOD_SPORTS = new Set(["ice-hockey", "handball", "water-polo", "field-hockey", "lacrosse"]);
const SET_SPORTS = new Set(["tennis", "table-tennis", "badminton", "volleyball"]);

function quarterClock(period, clock, prefix) {
  const label = period != null && period !== "" ? `${prefix}${period}` : "";
  if (label && clock != null && clock !== "") return `${label} ${clock}`;
  if (label) return label;
  if (clock != null && clock !== "") return String(clock);
  return "";
}

function americanFootballClock(period, clock) {
  const map = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
  const q = period != null && period !== "" ? map[Number(period)] || `Q${period}` : "";
  if (q && clock != null && clock !== "") return `${q} ${clock}`;
  return q || (clock != null && clock !== "" ? String(clock) : "");
}

export function baseballState(event) {
  const score = event?.score || {};
  const inn = score.inning || event?.innings || score.period;
  const halfRaw = String(score.inning_half || score.half || score.inning_state || "").toLowerCase();
  const outs = score.outs;
  let innLabel = "";
  if (inn) {
    if (halfRaw.startsWith("b") || halfRaw.includes("bot")) innLabel = `▼${inn}`;
    else if (halfRaw.startsWith("t") || halfRaw.includes("top")) innLabel = `▲${inn}`;
    else innLabel = `${inn}th`;
  }
  const outLabel = outs != null && outs !== "" ? `${outs} OUT` : "";
  return [innLabel, outLabel].filter(Boolean).join(" · ");
}

export function liveClockLabel(event, t) {
  const score = event?.score || {};
  const sport = event?.sport || "";
  const family = event?.event_family || "";
  const status = String(event?.status || "").toLowerCase();
  if (isRacingEvent(event)) {
    return isFinishedStatus(status) ? t("live.raceFinished") : t("live.scheduled");
  }
  if (status === "halftime" || status === "ht" || status === "break") {
    if (sport === "football" || sport === "futsal") return t("live.ht");
    return t("live.break");
  }
  if (status === "et" || status === "aet" || String(score.period || "").toUpperCase() === "ET") {
    const minute = score.minute || event.minute;
    if (MINUTE_SPORTS.has(sport) && minute != null && minute !== "") {
      return `ET ${String(minute).includes("'") ? minute : `${minute}’`}`;
    }
    if (MINUTE_SPORTS.has(sport)) return "ET";
  }
  if (status === "pen" || status === "penalties" || score.penalties) return "PEN";

  const minute = score.minute || event.minute;
  const period = score.period || score.quarter || event.period;
  const setNo = score.set || event.current_set;
  const clock = score.clock_stale ? null : score.clock;

  if (MINUTE_SPORTS.has(sport)) {
    if (minute != null && minute !== "") {
      const rawMinute = String(minute).trim();
      if (/^\d/.test(rawMinute)) {
        return rawMinute.includes("'") || rawMinute.includes("’") ? rawMinute : `${rawMinute}’`;
      }
      if (/^(ht|ft|et|pen)$/i.test(rawMinute)) return rawMinute.toUpperCase();
    }
    if (clock != null && clock !== "") return String(clock);
    return t("live.live");
  }
  if (sport === "american-football") {
    return americanFootballClock(period, clock) || t("live.live");
  }
  if (QUARTER_SPORTS.has(sport)) {
    return quarterClock(period, clock, "Q") || t("live.live");
  }
  if (PERIOD_SPORTS.has(sport)) {
    const extra = String(period || "").toUpperCase();
    if (extra === "OT" || extra === "SO") return extra;
    return quarterClock(period, clock, "P") || t("live.live");
  }
  if (sport === "baseball") {
    return baseballState(event) || t("live.live");
  }
  if (SET_SPORTS.has(sport)) {
    const setLabel = setNo || period;
    if (setLabel != null && setLabel !== "") return `Set ${setLabel}`;
    return t("live.live");
  }
  if (sport === "cricket") {
    if (score.overs != null && score.overs !== "") return `${score.overs} ov`;
    if (score.innings || event.innings) return String(score.innings || event.innings);
    return t("live.live");
  }
  if (sport === "motorsport" || family === "motorsport_race") {
    const lap = score.lap || event.lap;
    const total = score.laps || event.laps;
    if (lap != null && total != null) return `Lap ${lap}/${total}`;
    if (lap != null) return `Lap ${lap}`;
    return t("live.live");
  }
  if (sport === "golf") {
    if (score.round || event.round) return `R${score.round || event.round}`;
    return t("live.live");
  }
  if (family === "esports_match") {
    const mapNo = score.map || event.map || event.current_map;
    if (mapNo != null && mapNo !== "") return `Map ${mapNo}`;
    return t("live.live");
  }
  return t("live.live");
}

export function statusLabel(event, t, localeTime) {
  if (!event) return "";
  const raw = String(event.status || "").toLowerCase();
  if (raw === "walkover" || event.walkover || event.result_type === "walkover") return t("live.walkover");
  if (raw === "abandoned" || event.result_type === "abandoned") return t("live.abandoned");
  if (event.result_type === "retirement") return t("live.retired");
  if (raw === "postponed") return t("live.postponed");
  if (raw === "delayed") return t("live.delayed");
  if (raw === "suspended") return t("live.suspended");
  if (raw === "cancelled" || raw === "canceled") return t("live.cancelled");
  if (isRacingEvent(event)) {
    if (isFinishedStatus(raw)) return finishedLabel(event, t);
    return localeTime || "";
  }
  if (isConfirmedLive(event)) return liveClockLabel(event, t);
  if (isFinishedStatus(raw)) return finishedLabel(event, t);
  if (!localeTime && (event.start_precision === "DATE_ONLY" || event.start_precision === "UNKNOWN")) {
    return t("live.tbd");
  }
  return localeTime || "";
}

export function pairScoreText(event) {
  const score = event?.score || {};
  return formatPairScore(score.home, score.away);
}

export function sportScoreText(event) {
  const kind = rendererForEvent(event);
  const score = event?.score || {};
  const sets = periodRows(event);
  const sport = event?.sport || "";

  if (kind === "RACE" || kind === "MEET" || kind === "MULTI_EVENT_MEET" || kind === "TOURNAMENT") {
    const leader = namedLeader(event);
    return leader || pairScoreText(event);
  }

  if ((sport === "tennis" || sport === "table-tennis" || sport === "badminton" || sport === "volleyball") && sets.length) {
    return sets.map((row) => `${row.home ?? "–"}-${row.away ?? "–"}`).join("  ");
  }
  if (sport === "cricket" && (score.runs != null || score.wickets != null)) {
    const runs = scoreCell(score.runs ?? score.home);
    const wickets = scoreCell(score.wickets);
    if (runs == null) return pairScoreText(event);
    return wickets == null ? String(runs) : `${runs}/${wickets}`;
  }
  if (event.maps && Array.isArray(event.maps) && hasPairScore(event)) {
    return pairScoreText(event);
  }
  if (event.walkover || event.result_type === "walkover") return "W/O";
  if (event.result_type === "retirement") return "Retired";
  if (kind === "HEAD_TO_HEAD" && event.result_type) {
    const pair = pairScoreText(event);
    return pair === "–" ? String(event.result_type) : pair;
  }
  return pairScoreText(event);
}

export function namedLeader(event) {
  if (event?.winner) return displayParticipantName(event.winner);
  const rows =
    event.classification ||
    event.leaderboard ||
    event.runners ||
    event.athletes ||
    event.result ||
    [];
  if (!Array.isArray(rows) || !rows.length) return "";
  const first = rows[0];
  if (typeof first === "string") return displayParticipantName(first);
  return displayParticipantName(first.name || first.driver || first.horse || first.team || first.player || "");
}

export function namedField(list, limit = 3) {
  return (list || [])
    .map((item) =>
      typeof item === "string"
        ? displayParticipantName(item)
        : displayParticipantName(item?.name || item?.driver || item?.horse || item?.team || "")
    )
    .filter(Boolean)
    .slice(0, limit);
}

export function eventTitle(event) {
  return (
    event?.tournament ||
    event?.race_name ||
    displayParticipantName(event?.home) ||
    event?.session_type ||
    event?.competition ||
    ""
  );
}

export function competitionKind(event) {
  const family = String(event?.event_family || "").toLowerCase();
  const sport = event?.sport || "";
  const registry = sportRecord(sport);
  if (registry?.category === "esports" || family === "esports_match") return "esports";
  if (family === "motorsport_race" || family === "stage_race" || registry?.event_model === "motorsport_race") {
    return "race";
  }
  if (family === "racing" || registry?.event_model === "racing") return "race";
  if (MEET_SPORTS.has(sport) || family === "individual") return "meet";
  if (family === "tournament" || registry?.event_model === "tournament") return "tournament";
  if (registry?.country_based || family === "team_match") return "league";
  return "league";
}

export function usesPeriodGrid(event) {
  const sport = event?.sport || "";
  return SET_SPORTS.has(sport) && periodRows(event).length > 0;
}

export function cricketScoreText(event) {
  const score = event?.score || {};
  if (score.runs == null && score.wickets == null && !score.overs) return pairScoreText(event);
  const runs = scoreCell(score.runs ?? score.home);
  const wickets = scoreCell(score.wickets);
  const overs = scoreCell(score.overs);
  const core = runs == null ? pairScoreText(event) : wickets == null ? String(runs) : `${runs}/${wickets}`;
  return overs == null ? core : `${core} (${overs} ov)`;
}

export function golfBoard(event, limit = 4) {
  const rows = event?.leaderboard || event?.classification || event?.athletes || [];
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, limit).map((row, index) => {
    if (typeof row === "string") {
      return { position: index + 1, name: displayParticipantName(row), total: "", thru: "" };
    }
    return {
      position: row.position || row.pos || index + 1,
      name: displayParticipantName(row.name || row.player || row.athlete || ""),
      total: row.total ?? row.score ?? row.to_par ?? "",
      thru: row.thru ?? row.holes ?? row.round ?? "",
    };
  }).filter((row) => row.name);
}

export function winningSide(event) {
  if (!isFinishedStatus(event?.status)) return null;
  const home = event?.score?.home;
  const away = event?.score?.away;
  if (typeof home !== "number" || typeof away !== "number") return null;
  if (home > away) return "home";
  if (away > home) return "away";
  return null;
}

export function freshnessLabel(updatedAt, now = Date.now()) {
  if (!updatedAt) return "";
  const stamp = new Date(updatedAt).getTime();
  if (Number.isNaN(stamp)) return "";
  const seconds = Math.max(0, Math.round((now - stamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

export function scoreDisplay(value) {
  const cell = scoreCell(value);
  return cell == null ? "–" : String(cell);
}

export function coverageForSport(slug) {
  const registry = sportRecord(slug);
  const model = registry?.event_model || "team_match";
  const fake = {
    sport: slug,
    event_family: MODEL_FAMILY[model] || model,
    event_model: model,
  };
  const renderer = rendererForEvent(fake);
  return {
    slug,
    event_model: model,
    renderer,
    unknown: renderer === "UNKNOWN",
  };
}
