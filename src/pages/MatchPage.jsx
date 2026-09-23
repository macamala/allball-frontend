import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getArticles, getMatch, getStandings } from "../api.js";
import { setPageSeo, breadcrumbJsonLd } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import { eventPath, publicEventSafe, normalizeEvent, participantName } from "../lib/sportsData.js";
import { competitionLabel } from "../labels.js";
import ProviderPending from "../components/ProviderPending.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import MatchCentre from "../components/scores/MatchCentre.jsx";

function payloadEventId(payload) {
  return payload?.event?.id || payload?.header?.id || payload?.id || "";
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

  useEffect(() => {
    let cancelled = false;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    setData((prev) => (payloadEventId(prev) === matchId ? prev : null));
    setStandings([]);
    setArticles([]);
    setError(false);
    setLoading(true);
    getMatch(matchId, controller ? { signal: controller.signal } : {})
      .then((payload) => {
        if (cancelled) return;
        const payloadId = payloadEventId(payload);
        if (payloadId && payloadId !== matchId) return;
        setData(payload);
        setError(false);
      })
      .catch((err) => {
        if (cancelled || err?.name === "AbortError") return;
        setError(true);
        setData({ connected: false, id: matchId });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [matchId]);

  const event = useMemo(() => {
    const payloadEvent = data?.event || data?.header;
    if (payloadEvent && (payloadEvent.id === matchId || data?.id === matchId)) {
      return normalizeEvent(publicEventSafe(payloadEvent));
    }
    if (preview) return normalizeEvent(publicEventSafe(preview));
    return null;
  }, [data, preview, matchId]);
  const home = participantName(event?.home);
  const away = participantName(event?.away);
  const title =
    home && away ? `${home} vs ${away}` : event?.tournament || t("match.center");
  const path = eventPath(matchId);

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
