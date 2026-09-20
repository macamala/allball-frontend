import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getSportsDataEvents, getSportsDataLive, getSportsDataStatusDelta } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  eventLocalDateKey,
  eventMatchesFavorite,
  isoDate,
  isConfirmedLive,
  localDayUtcBounds,
  matchesStatusView,
  mergeEventPayload,
  normalizeEvent,
  publicEventSafe,
  sportCounts,
  statusCounts,
} from "../lib/sportsData.js";
import { allRegistrySports, getRegistrySport } from "../config/sportsRegistry.js";
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
import { collapseDisplayEvents } from "../lib/scoreIdentity.js";

const STATUSES = [
  { id: "all", labelKey: "live.all" },
  { id: "live", labelKey: "live.live" },
  { id: "upcoming", labelKey: "live.upcoming" },
  { id: "finished", labelKey: "live.finished" },
  { id: "favorites", labelKey: "live.favorites" },
];

const PRIMARY_SPORTS = [
  "football",
  "basketball",
  "tennis",
  "ice-hockey",
  "baseball",
  "rugby",
  "cricket",
  "handball",
  "volleyball",
  "motorsport",
  "golf",
  "esports",
];

function payloadEvents(data) {
  const raw = data?.events?.length ? data.events : data?.matches || [];
  return raw.map((row) => normalizeEvent(publicEventSafe(row))).filter((item) => item?.id);
}

function eventMatchesSport(event, sport) {
  if (!sport || sport === "all" || sport === "mine") return true;
  if (sport === "esports") {
    const registry = getRegistrySport(event.sport);
    return event.sport === "esports" || registry?.parent_id === "esports" || event.parent_sport_id === "esports";
  }
  return event.sport === sport;
}

export default function LiveScoresPage() {
  const { t, dateLocale } = useI18n();
  const { favorites } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = isoDate(new Date());
  const status = searchParams.get("filter") || searchParams.get("status") || "all";
  const date = searchParams.get("date") || today;
  const sport = searchParams.get("sport") || "all";
  const competition = searchParams.get("competition") || "";
  const [board, setBoard] = useState({ key: "", payload: null });
  const [error, setError] = useState(false);
  const requestSeq = useRef(0);
  const sinceRef = useRef(new Date().toISOString());

  const requestKey = `${date}|${competition}`;

  const sports = useMemo(() => {
    const followed = favorites?.sports || [];
    const rows = allRegistrySports().filter((item) => item.active !== false);
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
    if (next.status && next.status !== "all") params.filter = next.status;
    if (next.date && next.date !== today) params.date = next.date;
    if (next.sport && next.sport !== "all") params.sport = next.sport;
    if (next.competition) params.competition = next.competition;
    setSearchParams(params);
  }

  const fetchScores = useCallback(
    (silent = false) => {
      const filters = { ...localDayUtcBounds(date) };
      if (competition) filters.competition = competition;
      const key = `${date}|${competition}`;
      const seq = ++requestSeq.current;
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
          if (!silent) {
            setBoard((prev) => (prev.key === key && prev.payload ? prev : { key, payload: prev.payload }));
          }
        });
    },
    [competition, date]
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
    () => payloadEvents(board.payload || {}).some((event) => isConfirmedLive(event)),
    [board.payload]
  );
  const refreshLive = useCallback(() => {
    Promise.all([
      getSportsDataLive({}),
      getSportsDataStatusDelta({ since: sinceRef.current }),
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
  }, []);
  useVisiblePoll(silentRefresh, livePresent ? 120000 : 45000);
  useVisiblePoll(refreshLive, livePresent ? 8000 : 25000);

  const dayEvents = useMemo(() => {
    if (board.key !== requestKey || !board.payload) return [];
    return collapseDisplayEvents(
      payloadEvents(board.payload).filter((event) => eventLocalDateKey(event) === date)
    );
  }, [board, date, requestKey]);

  const sportFiltered = useMemo(() => {
    let rows = dayEvents.filter((event) => eventMatchesSport(event, sport));
    if (sport === "mine") {
      rows = rows.filter((event) => eventMatchesFavorite(event, favorites));
    }
    return rows;
  }, [dayEvents, favorites, sport]);

  const counts = useMemo(() => statusCounts(sportFiltered), [sportFiltered]);
  const events = useMemo(() => {
    if (status === "favorites") {
      return sportFiltered.filter((event) => eventMatchesFavorite(event, favorites));
    }
    return sportFiltered.filter((event) => matchesStatusView(event, status));
  }, [favorites, sportFiltered, status]);

  const bySport = useMemo(() => {
    const raw = sportCounts(dayEvents);
    const rolled = { ...raw };
    for (const [slug, count] of Object.entries(raw)) {
      const registry = getRegistrySport(slug);
      if (registry?.parent_id === "esports") {
        rolled.esports = (rolled.esports || 0) + count;
      }
    }
    return rolled;
  }, [dayEvents]);

  const liveCount = useMemo(() => dayEvents.filter((event) => isConfirmedLive(event)).length, [dayEvents]);

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

  const primaryItems = [
    { id: "all", label: t("live.allSports"), icon: "◎", count: dayEvents.length },
    { id: "mine", label: t("live.mySports"), icon: "★", count: 0 },
    ...PRIMARY_SPORTS.map((slug) => {
      const row = sports.find((item) => item.slug === slug) || getRegistrySport(slug);
      return {
        id: slug,
        label: t(sportI18nKey(slug) || "sport.label"),
        count: bySport[slug] || 0,
        icon: "",
        hidden: !row,
      };
    }).filter((item) => !item.hidden),
  ];

  const otherItems = sports
    .filter((item) => !PRIMARY_SPORTS.includes(item.slug) && item.slug !== "esports")
    .map((item) => ({
      id: item.slug,
      label: t(sportI18nKey(item.slug) || "sport.label"),
      count: bySport[item.slug] || 0,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

  const sidebarLive = dayEvents.filter((item) => isConfirmedLive(item)).slice(0, 6);
  const payloadReady = board.key === requestKey && board.payload;
  const showSidebar = Boolean(
    payloadReady && (sidebarLive.length || topComps.length || (favorites?.sports || []).length)
  );

  let emptyTitle = t("live.emptyDateTitle");
  let emptyBody = t("live.emptyBody");
  if (status === "live") {
    emptyTitle = t("live.emptyLiveTitle");
    emptyBody = t("live.emptyLiveBody");
  } else if (status === "favorites") {
    emptyTitle = t("live.emptyFavoritesTitle");
    emptyBody = t("live.emptyFavoritesBody");
  } else if (sport !== "all" && sport !== "mine") {
    emptyTitle = t("live.emptySportTitle");
    emptyBody = t("live.emptySportBody");
  }

  const stale = error && payloadReady;

  return (
    <div className="page-scores">
      <header className="score-centre-head">
        <div>
          <h1>{t("liveScores")}</h1>
          <p className="score-centre-sub">{t("live.subtitle")}</p>
        </div>
        {liveCount > 0 ? (
          <p className="score-live-global" aria-live="polite">
            <span className="live-dot" aria-hidden="true" />
            {liveCount} {t("live.live")}
          </p>
        ) : null}
      </header>
      <SportRail
        ariaLabel={t("live.allSports")}
        value={sport}
        items={primaryItems}
        otherItems={otherItems}
        onChange={(id) => updateParams({ sport: id, competition: "" })}
      />
      <DateRail
        date={date}
        today={today}
        t={t}
        locale={dateLocale}
        onChange={(next) => updateParams({ date: next })}
      />
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
            {item.id !== "favorites" && counts[item.id] > 0 ? (
              <span className="status-count">{counts[item.id]}</span>
            ) : null}
          </button>
        ))}
      </div>
      {stale ? <p className="score-stale">{t("live.staleUpdate")}</p> : null}
      <div className={showSidebar ? "score-centre-layout has-aside" : "score-centre-layout"}>
        <div className="score-centre-main">
          {error && !board.payload ? (
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
            <EmptyState
              title={emptyTitle}
              body={emptyBody}
              compact
              action={
                <div className="score-empty-actions">
                  {status !== "all" ? (
                    <button type="button" className="btn" onClick={() => updateParams({ status: "all" })}>
                      {t("live.showAll")}
                    </button>
                  ) : null}
                  {date !== today ? (
                    <button type="button" className="btn ghost" onClick={() => updateParams({ date: today })}>
                      {t("live.today")}
                    </button>
                  ) : null}
                  {sport !== "all" ? (
                    <button type="button" className="btn ghost" onClick={() => updateParams({ sport: "all" })}>
                      {t("live.allSports")}
                    </button>
                  ) : null}
                </div>
              }
            />
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
            {(favorites?.leagues || []).length && topComps.length ? (
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
          </aside>
        ) : null}
      </div>
    </div>
  );
}
