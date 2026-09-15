/** Shared normalized sports-data helpers for Live Scores and Predictions.

Frontend never depends on a vendor response shape. Both ScoreMatch-style
rows and NormalizedEvent objects are mapped here.
*/

export function participantName(side) {
  if (!side) return "";
  if (typeof side === "string") return side;
  return side.name || "";
}

export function normalizeEvent(raw) {
  if (!raw) return null;
  const home =
    raw.home && typeof raw.home === "object"
      ? {
          id: raw.home.id || "",
          slug: raw.home.slug || raw.home_slug || "",
          name: raw.home.name || raw.home_team || "",
          side: "home",
        }
      : {
          id: raw.home_id || "",
          slug: raw.home_slug || "",
          name: raw.home || raw.home_team || "",
          side: "home",
        };
  const away =
    raw.away && typeof raw.away === "object"
      ? {
          id: raw.away.id || "",
          slug: raw.away.slug || raw.away_slug || "",
          name: raw.away.name || raw.away_team || "",
          side: "away",
        }
      : {
          id: raw.away_id || "",
          slug: raw.away_slug || "",
          name: raw.away || raw.away_team || "",
          side: "away",
        };
  const score =
    raw.score && typeof raw.score === "object"
      ? {
          home: raw.score.home ?? raw.home_score ?? null,
          away: raw.score.away ?? raw.away_score ?? null,
          period: raw.score.period || raw.period || null,
          minute: raw.score.minute || raw.minute || null,
        }
      : {
          home: raw.home_score ?? null,
          away: raw.away_score ?? null,
          period: raw.period || null,
          minute: raw.minute || null,
        };
  const status = raw.status || (raw.live ? "live" : "scheduled");
  return {
    id: String(raw.id || ""),
    sport: raw.sport || "",
    competition: raw.competition || raw.league || "",
    competition_key: raw.competition_key || raw.league || "",
    season: raw.season || null,
    home,
    away,
    start_time: raw.start_time || raw.kickoff || null,
    status,
    score,
    venue: raw.venue || null,
    provider: raw.provider || null,
    provider_id: raw.provider_id || null,
    updated_at: raw.updated_at || null,
    live: Boolean(raw.live || status === "live"),
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
  return null;
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
