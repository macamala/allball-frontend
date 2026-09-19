import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getRecentArticles, getSportsDataEvents, getSportsDataLive, getSportsDataStatusDelta } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  eventLocalDateKey,
  isoDate,
  isLiveStatus,
  localDayUtcBounds,
  matchesStatusView,
  mergeEventPayload,
  normalizeEvent,
  statusCounts,
} from "../lib/sportsData.js";
import { scoreboardSports } from "../config/sportsRegistry.js";
import { sportI18nKey } from "../i18n/index.js";
import { competitionLabel } from "../labels.js";
import ProviderPending from "../components/ProviderPending.jsx";
import EmptyState from "../components/EmptyState.jsx";
import EventList from "../components/scores/EventList.jsx";
import EventRow from "../components/scores/EventRow.jsx";
import SportRail from "../components/scores/SportRail.jsx";
import DateRail from "../components/scores/DateRail.jsx";
import useVisiblePoll from "../hooks/useVisiblePoll.js";
import { ScoreBoardSkeleton } from "../components/Skeleton.jsx";

const STATUSES = [
  { id: "all", labelKey: "live.all" },
  { id: "live", labelKey: "live.live" },
  { id: "upcoming", labelKey: "live.upcoming" },
  { id: "finished", labelKey: "live.finished" },
];

const SPORT_ICONS = {
  team: "●",
  racket: "◌",
  combat: "◆",
  motorsport: "▣",
  racing: "▸",
  esports: "▦",
  individual: "○",
};

function payloadEvents(data) {
  const raw = data?.events?.length ? data.events : data?.matches || [];
  return raw.map(normalizeEvent).filter((item) => item?.id);
}

export default function LiveScoresPage() {
  const { t } = useI18n();
  const { favorites } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = isoDate(new Date());
  const status = searchParams.get("status") || "all";
  const date = searchParams.get("date") || today;
  const sport = searchParams.get("sport") || "all";
  const competition = searchParams.get("competition") || "";
  const [board, setBoard] = useState({ key: "", payload: null });
  const [news, setNews] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);
  const sinceRef = useRef(new Date().toISOString());

  const requestKey = `${date}|${sport}|${competition}`;

  const sports = useMemo(() => {
    const followed = favorites?.sports || [];
    const rows = scoreboardSports();
    return [...rows].sort((left, right) => {
      const leftFav = followed.includes(left.slug) ? 0 : 1;
      const rightFav = followed.includes(right.slug) ? 0 : 1;
      if (leftFav !== rightFav) return leftFav - rightFav;
      return (left.display_priority || 200) - (right.display_priority || 200);
    });
  }, [favorites]);

  function updateParams(patch) {
    const next = { status, date, sport, competition, ...patch };
    const params = {};
    if (next.status && next.status !== "all") params.status = next.status;
    if (next.date && next.date !== today) params.date = next.date;
    if (next.sport && next.sport !== "all") params.sport = next.sport;
    if (next.competition) params.competition = next.competition;
    setSearchParams(params);
  }

  const fetchScores = useCallback(
    (silent = false) => {
      const filters = { ...localDayUtcBounds(date) };
      if (sport && sport !== "all" && sport !== "mine") filters.sport = sport;
      if (competition) filters.competition = competition;
      const key = `${date}|${sport}|${competition}`;
      const seq = ++requestSeq.current;
      if (!silent) setLoading(true);
      getSportsDataEvents(filters)
        .then((data) => {
          if (seq !== requestSeq.current) return;
          setBoard({ key, payload: data });
          sinceRef.current = new Date().toISOString();
          setError(false);
        })
        .catch(() => {
          if (seq !== requestSeq.current) return;
          setError(true);
          if (!silent) setBoard({ key, payload: null });
        })
        .finally(() => {
          if (seq === requestSeq.current) setLoading(false);
        });
    },
    [competition, date, sport]
  );

  useEffect(() => {
    setPageSeo({
      title: t("seo.liveTitle"),
      description: t("seo.liveDescription"),
      path: `/live-scores${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    });
  }, [searchParams, t]);

  useEffect(() => {
    fetchScores(false);
  }, [fetchScores]);

  const silentRefresh = useCallback(() => fetchScores(true), [fetchScores]);
  const livePresent = useMemo(
    () => payloadEvents(board.payload || {}).some((event) => event.live || isLiveStatus(event.status)),
    [board.payload]
  );
  const refreshLive = useCallback(() => {
    const filters = {};
    if (sport && sport !== "all" && sport !== "mine") filters.sport = sport;
    Promise.all([
      getSportsDataLive(filters),
      getSportsDataStatusDelta({ since: sinceRef.current, ...(filters.sport ? { sport: filters.sport } : {}) }),
    ])
      .then(([live, delta]) => {
        sinceRef.current = new Date().toISOString();
        setBoard((prev) => {
          if (!prev.payload) return prev;
          return {
            ...prev,
            payload: mergeEventPayload(prev.payload, [...(live?.events || []), ...(delta?.events || [])]),
          };
        });
      })
      .catch(() => {});
  }, [sport]);
  useVisiblePoll(silentRefresh, livePresent ? 120000 : 45000);
  useVisiblePoll(refreshLive, livePresent ? 8000 : 25000);

  const dayEvents = useMemo(() => {
    if (board.key !== requestKey || !board.payload) return [];
    let rows = payloadEvents(board.payload).filter((event) => eventLocalDateKey(event) === date);
    if (sport === "mine") {
      const followedSports = favorites?.sports || [];
      const followedLeagues = favorites?.leagues || [];
      rows = rows.filter((event) => {
        if (followedSports.includes(event.sport)) return true;
        const key = `${event.sport}:${event.competition_key}`;
        return followedLeagues.includes(key) || followedLeagues.includes(event.competition_key);
      });
    }
    return rows;
  }, [board, date, favorites, requestKey, sport]);

  const counts = useMemo(() => statusCounts(dayEvents), [dayEvents]);
  const events = useMemo(
    () => dayEvents.filter((event) => matchesStatusView(event, status)),
    [dayEvents, status]
  );

  useEffect(() => {
    let cancelled = false;
    getRecentArticles(6)
      .then((rows) => {
        if (!cancelled && Array.isArray(rows)) setNews(rows.slice(0, 5));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const topComps = useMemo(() => {
    const countsMap = new Map();
    dayEvents.forEach((event) => {
      const key = event.competition_key || event.competition;
      if (!key) return;
      countsMap.set(key, (countsMap.get(key) || 0) + 1);
    });
    return [...countsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, count]) => ({ key, count, label: competitionLabel(key) }));
  }, [dayEvents]);

  const sportItems = [
    { id: "all", label: t("live.allSports"), icon: "◎" },
    { id: "mine", label: t("live.mySports"), icon: "★" },
    ...sports.map((item) => ({
      id: item.slug,
      label: t(sportI18nKey(item.slug) || "sport.label"),
      icon: SPORT_ICONS[item.category] || "●",
    })),
  ];

  const sidebarLive = dayEvents.filter((item) => item.live).slice(0, 6);
  const payloadReady = board.key === requestKey && board.payload;
  const showSidebar = Boolean(
    payloadReady && (sidebarLive.length || topComps.length || (favorites?.sports || []).length || news.length)
  );

  let emptyTitle = t("live.emptyTitle");
  let emptyBody = t("live.emptyBody");
  if (status === "live") {
    emptyTitle = t("live.emptyLiveTitle");
    emptyBody = t("live.emptyLiveBody");
  } else {
    emptyTitle = t("live.emptyDateTitle");
  }

  return (
    <div className="page-scores">
      <header className="score-centre-head">
        <div>
          <h1>{t("liveScores")}</h1>
        </div>
        <div className="score-status-tabs" role="tablist" aria-label={t("liveScores")}>
          {STATUSES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === status}
              className={item.id === status ? `status-tab is-active is-${item.id}` : `status-tab is-${item.id}`}
              onClick={() => updateParams({ status: item.id })}
            >
              {t(item.labelKey)}
              {counts[item.id] > 0 ? <span className="status-count">{counts[item.id]}</span> : null}
            </button>
          ))}
        </div>
      </header>
      <DateRail date={date} today={today} t={t} onChange={(next) => updateParams({ date: next })} />
      <SportRail
        ariaLabel={t("live.allSports")}
        value={sport}
        items={sportItems}
        onChange={(id) => updateParams({ sport: id, competition: "" })}
      />
      <div className={showSidebar ? "score-centre-layout has-aside" : "score-centre-layout"}>
        <div className="score-centre-main">
          {error ? (
            <EmptyState
              title={t("live.unavailableTitle")}
              body={t("live.unavailableBody")}
              action={
                <button type="button" className="btn" onClick={() => fetchScores(false)}>
                  {t("live.retry")}
                </button>
              }
            />
          ) : !payloadReady ? (
            <ScoreBoardSkeleton />
          ) : board.payload.connected === false ? (
            <ProviderPending title={t("live.readyTitle")} body={t("live.readyBody")} />
          ) : events.length ? (
            <EventList events={events} />
          ) : (
            <EmptyState title={emptyTitle} body={emptyBody} compact />
          )}
        </div>
        {showSidebar ? (
          <aside className="score-centre-aside">
            {sidebarLive.length && (status === "upcoming" || status === "finished") ? (
              <section>
                <h2>{t("live.liveNow")}</h2>
                <ul className="score-aside-list">
                  {sidebarLive.map((event) => (
                    <EventRow key={event.id} event={event} compact />
                  ))}
                </ul>
              </section>
            ) : null}
            {topComps.length ? (
              <section>
                <h2>{t("live.topCompetitions")}</h2>
                <ul className="score-aside-links">
                  {topComps.map((item) => (
                    <li key={item.key}>
                      <button type="button" onClick={() => updateParams({ competition: item.key })}>
                        {item.label}
                        <span>{item.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {(favorites?.sports || []).length ? (
              <section>
                <h2>{t("live.mySports")}</h2>
                <p>
                  <Link to="/my-sports">{t("seeAll")}</Link>
                </p>
              </section>
            ) : null}
            {news.length ? (
              <section>
                <h2>{t("latest")}</h2>
                <ul className="score-aside-news">
                  {news.map((article) => (
                    <li key={article.id || article.slug}>
                      <Link to={`/article/${article.slug}`}>{article.title}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
