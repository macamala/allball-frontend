import { getRegistrySport } from "../config/sportsRegistry.js";
import {
  isFinishedStatus,
  isLiveStatus,
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

function setRows(event) {
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

export function liveClockLabel(event, t) {
  const score = event?.score || {};
  const sport = event?.sport || "";
  const family = event?.event_family || "";
  const status = String(event?.status || "").toLowerCase();
  if (status === "halftime" || status === "ht" || status === "break") {
    if (sport === "football" || sport === "futsal") return t("live.ht");
    return t("live.break");
  }
  const minute = score.minute || event.minute;
  const period = score.period || score.quarter || event.period;
  const setNo = score.set || event.current_set;
  const clock = score.clock_stale ? null : score.clock;
  const inningHalf = score.inning_half || score.half || score.inning_state;
  const innings = score.inning || event.innings;

  if (sport === "football" || sport === "futsal") {
    if (minute != null && minute !== "") {
      return String(minute).includes("'") ? String(minute) : `${minute}’`;
    }
    if (clock != null && clock !== "") return String(clock);
    return t("live.live");
  }
  if (sport === "basketball") {
    const q = period != null && period !== "" ? `Q${period}` : "";
    if (q && clock != null && clock !== "") return `${q} ${clock}`;
    if (q) return q;
    if (clock != null && clock !== "") return String(clock);
    return t("live.live");
  }
  if (sport === "ice-hockey") {
    const p = period != null && period !== "" ? `P${period}` : "";
    if (p && clock != null && clock !== "") return `${p} ${clock}`;
    if (p) return p;
    return t("live.live");
  }
  if (sport === "baseball") {
    const inn = innings || period;
    if (inningHalf && inn) {
      const half = String(inningHalf).toLowerCase().startsWith("b") ? "Bot" : "Top";
      return `${half} ${inn}`;
    }
    if (inn) return `Inn ${inn}`;
    return t("live.live");
  }
  if (sport === "tennis" || sport === "table-tennis" || sport === "badminton") {
    if (setNo != null && setNo !== "") return `Set ${setNo}`;
    return t("live.live");
  }
  if (sport === "volleyball") {
    const setLabel = setNo || period;
    if (setLabel != null && setLabel !== "") return `Set ${setLabel}`;
    return t("live.live");
  }
  if (sport === "cricket") {
    if (score.innings || event.innings) return String(score.innings || event.innings);
    return t("live.live");
  }
  if (sport === "motorsport" || family === "motorsport_race") return t("live.live");
  if (sport === "horse-racing" || sport === "greyhound-racing" || sport === "harness-racing") {
    return t("live.live");
  }
  if (family === "esports_match") return t("live.live");
  return t("live.live");
}

export function statusLabel(event, t, localeTime) {
  if (!event) return "";
  const raw = String(event.status || "").toLowerCase();
  if (isLiveStatus(raw)) return liveClockLabel(event, t);
  if (raw === "walkover") return t("live.walkover");
  if (raw === "abandoned") return t("live.abandoned");
  if (isFinishedStatus(raw)) return finishedLabel(event, t);
  if (raw === "postponed") return t("live.postponed");
  if (raw === "delayed") return t("live.delayed");
  if (raw === "suspended") return t("live.suspended");
  if (raw === "cancelled" || raw === "canceled") return t("live.cancelled");
  return localeTime || "";
}

export function pairScoreText(event) {
  const score = event?.score || {};
  return formatPairScore(score.home, score.away);
}

export function sportScoreText(event) {
  const kind = rendererForEvent(event);
  const score = event?.score || {};
  const sets = setRows(event);
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
  if (kind === "HEAD_TO_HEAD" && event.result_type) {
    const pair = pairScoreText(event);
    return pair === "–" ? String(event.result_type) : pair;
  }
  return pairScoreText(event);
}

export function namedLeader(event) {
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
