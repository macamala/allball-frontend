import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getArticles, getJSON, getMatch, getStandings, matchPath } from "../api.js";
import { setPageSeo, breadcrumbJsonLd } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import { eventPath, isConfirmedLive, isFinishedStatus, publicEventSafe, normalizeEvent, participantName } from "../lib/sportsData.js";
import { competitionLabel } from "../labels.js";
import ProviderPending from "../components/ProviderPending.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import { newerMatchEvent } from "../lib/matchClock.js";
import { matchPayloadMatches } from "../lib/matchDetail.js";
import MatchCentre from "../components/scores/MatchCentre.jsx";
import useVisiblePoll from "../hooks/useVisiblePoll.js";
import { matchDetailPollMs } from "../lib/matchRefresh.js";
import { createMatchRequestGate } from "../lib/matchRequestGate.js";

function payloadEventId(payload) {
  return payload?.id || payload?.event?.id || payload?.header?.id || "";
}


const RICH_MATCH_KEYS = [
  "timeline",
  "incidents",
  "statistics",
  "lineups",
  "player_statistics",
  "standings",
  "classification",
  "leaderboard",
  "runners",
  "scorecard",
  "innings",
  "maps",
  "games",
  "rubbers",
  "shots",
  "h2h",
  "related",
  "form",
  "statistics_periods",
];

function hasRichValue(value) {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function preserveRichFields(previous, incoming) {
  const next = { ...(previous || {}), ...(incoming || {}) };
  for (const key of RICH_MATCH_KEYS) {
    if (!hasRichValue(incoming?.[key]) && hasRichValue(previous?.[key])) {
      next[key] = previous[key];
    }
  }
  return next;
}

function mergeMatchPayload(previous, incoming) {
  if (!previous) return incoming;
  if (!incoming) return previous;
  const next = preserveRichFields(previous, incoming);
  const prevEvent = previous.event || previous.header;
  const incomingEvent = incoming.event || incoming.header;
  if (prevEvent || incomingEvent) {
    const acceptedEvent = newerMatchEvent(prevEvent, incomingEvent);
    const event = preserveRichFields(prevEvent, acceptedEvent);
    event.score = { ...((prevEvent || {}).score || {}), ...((acceptedEvent || {}).score || {}) };
    event.sport_detail = {
      ...((prevEvent || {}).sport_detail || {}),
      ...((incomingEvent || {}).sport_detail || {}),
    };
    if (
      !hasRichValue((incomingEvent || {}).sport_detail?.shots) &&
      hasRichValue((prevEvent || {}).sport_detail?.shots)
    ) {
      event.sport_detail.shots = prevEvent.sport_detail.shots;
    }
    if (
      !hasRichValue((incomingEvent || {}).sport_detail?.statistics_periods) &&
      hasRichValue((prevEvent || {}).sport_detail?.statistics_periods)
    ) {
      event.sport_detail.statistics_periods = prevEvent.sport_detail.statistics_periods;
    }
    if (incoming.event || previous.event) next.event = event;
    if (incoming.header || previous.header) next.header = event;
  }
  return next;
}

export default function MatchPage() {
  const { t } = useI18n();
  const { matchId } = useParams();
  const location = useLocation();
  const preview = location.state?.event?.id === matchId ? location.state.event : null;
  const [data, setData] = useState(null);
  const [standings, setStandings] = useState([]);
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);
  const scoreFlight = useRef(null);
  const detailGate = useRef(null);
  const lastPollEvent = useRef(null);
  if (!detailGate.current) detailGate.current = createMatchRequestGate();
  const routeId = useRef({id: matchId, generation: 0});
  if (routeId.current.id !== matchId) routeId.current = {id: matchId, generation: routeId.current.generation + 1};

  useEffect(() => {
    let cancelled = false;
    const request = routeId.current;
    const flight = detailGate.current.begin(request);
    if (!flight) return undefined;
    const seq = ++requestSeq.current;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    setData((prev) => (payloadEventId(prev) === matchId ? prev : null));
    setStandings([]);
    setArticles([]);
    setError(false);
    setLoading(true);
    getMatch(matchId, controller ? { signal: controller.signal } : {})
      .then((payload) => {
        if (cancelled || seq !== requestSeq.current) return;
        if (!matchPayloadMatches(payload, matchId)) return;
        setData(payload);
        setError(false);
      })
      .catch((err) => {
        if (cancelled || seq !== requestSeq.current || err?.name === "AbortError") return;
        setError(true);
        setData({ connected: false, id: matchId });
      })
      .finally(() => {
        detailGate.current.finish(flight);
        if (!cancelled && seq === requestSeq.current) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller?.abort();
      detailGate.current.finish(flight);
    };
  }, [matchId]);

  const refreshMatch = useCallback(() => {
    const request = routeId.current;
    // Re-evaluate the deadline at the tick itself. Repeated transport failures
    // may not cause a render, so a previously scheduled interval can outlive FT.
    if (lastPollEvent.current?.id === matchId && matchDetailPollMs(lastPollEvent.current) === 0) return;
    const flight = detailGate.current.begin(request);
    if (!flight) return;
    const seq = ++requestSeq.current;
    return getJSON(matchPath(matchId))
      .then((payload) => {
        if (routeId.current !== request || seq !== requestSeq.current) return;
        if (!matchPayloadMatches(payload, matchId)) return;
        setData((previous) => mergeMatchPayload(previous, payload));
        setError(false);
      })
      .catch(() => {
        // Keep the last known good Match Centre visible through a transient
        // backend restart or network failure. The next visible poll retries.
      })
      .finally(() => {
        detailGate.current.finish(flight);
        if (routeId.current === request && seq === requestSeq.current) setLoading(false);
      });
  }, [matchId]);

  const refreshScore = useCallback(() => {
    const request = routeId.current;
    if (scoreFlight.current === request) return;
    scoreFlight.current = request;
    return getJSON(`${matchPath(matchId)}/score`)
      .then((payload) => {
        if (routeId.current !== request || !payload?.event || !matchPayloadMatches(payload, matchId)) return;
        setData(previous => mergeMatchPayload(previous, payload));
      })
      .catch(() => {}) // Retain the last confirmed result; never clear on network failure.
      .finally(() => { if (scoreFlight.current === request) scoreFlight.current = null; });
  }, [matchId]);

  const event = useMemo(() => {
    const payloadEvent = data?.event || data?.header;
    if (matchPayloadMatches(data, matchId)) {
      return normalizeEvent(publicEventSafe(payloadEvent));
    }
    if (preview) return normalizeEvent(publicEventSafe(preview));
    return null;
  }, [data, preview, matchId]);
  lastPollEvent.current = event;
  const home = participantName(event?.home);
  const away = participantName(event?.away);
  const title =
    home && away ? `${home} vs ${away}` : event?.tournament || t("match.center");
  const path = eventPath(matchId);
  // FT stops the fast score clock, not late-arriving lineups/statistics.
  // Visibility gating stays in useVisiblePoll; one detail request at a time.
  const matchPollMs = matchDetailPollMs(event);
  useVisiblePoll(refreshMatch, matchPollMs);
  useVisiblePoll(refreshScore, event && !isFinishedStatus(event.status) ? (isConfirmedLive(event) ? 5000 : 15000) : 0);

  useEffect(() => {
    setPageSeo({
      title: `${title} | NinkoSports`,
      description: event
        ? `${competitionLabel(event.competition)} · ${t("seo.liveDescription")}`
        : t("match.readyBody"),
      path,
      jsonLd: breadcrumbJsonLd([
        { name: t("nav.home"), path: "/" },
        { name: t("liveScores"), path: "/live-scores" },
        { name: title, path },
      ]),
      noindex: !event?.id,
    });
  }, [event?.id, event?.competition, path, t, title]);

  useEffect(() => {
    if (!event?.standings_available || !event?.competition_key) return undefined;
    let cancelled = false;
    getStandings(event.competition_key)
      .then((payload) => {
        if (!cancelled && payload?.connected && Array.isArray(payload.rows) && payload.rows.length) {
          setStandings(payload.rows);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [event?.competition_key, event?.standings_available]);

  useEffect(() => {
    if (!event?.sport || !event?.competition_key) return undefined;
    let cancelled = false;
    getArticles({ sport: event.sport, league: event.competition_key, limit: 6 })
      .then((payload) => {
        const rows = Array.isArray(payload) ? payload : payload?.articles || [];
        if (!cancelled) setArticles(rows.filter((row) => row?.slug && row?.title));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [event?.sport, event?.competition_key]);

  if (loading && !event) {
    return (
      <div className="page-match">
        <CardSkeleton count={2} />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="page-match">
        <EmptyState title={t("live.unavailableTitle")} body={t("live.unavailableBody")} />
      </div>
    );
  }

  return (
    <div className="page-match">
      <h1 className="sr-only">{title}</h1>
      {event ? (
        <MatchCentre event={event} data={payloadEventId(data) === matchId ? data : null} standings={standings} articles={articles} detailPending={loading} />
      ) : (
        <ProviderPending title={t("match.readyTitle")} body={t("match.readyBody")} />
      )}
    </div>
  );
}
