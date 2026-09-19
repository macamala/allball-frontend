import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getSportsDataLive,
  getSportsDataRecent,
  getSportsDataUpcoming,
} from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  addLocalDays,
  eventLocalDateKey,
  isoDate,
  localDayUtcBounds,
  normalizeEvent,
} from "../lib/sportsData.js";
import { scoreboardSports } from "../config/sportsRegistry.js";
import { sportI18nKey } from "../i18n/index.js";
import ProviderPending from "../components/ProviderPending.jsx";
import EmptyState from "../components/EmptyState.jsx";
import EventList from "../components/scores/EventList.jsx";
import useVisiblePoll from "../hooks/useVisiblePoll.js";
import { CardSkeleton } from "../components/Skeleton.jsx";

const STATUSES = [
  { id: "live", labelKey: "live.now" },
  { id: "upcoming", labelKey: "live.upcoming" },
  { id: "finished", labelKey: "live.finished" },
];

function payloadEvents(data) {
  const raw = data?.events?.length ? data.events : data?.matches || [];
  return raw.map(normalizeEvent).filter((item) => item?.id);
}

export default function LiveScoresPage() {
  const { t } = useI18n();
  const { favorites } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = isoDate(new Date());
  const status = searchParams.get("status") || "live";
  const date = searchParams.get("date") || today;
  const sport = searchParams.get("sport") || "all";
  const competition = searchParams.get("competition") || "";
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const sports = useMemo(() => {
    const followed = favorites?.sports || [];
    const rows = scoreboardSports();
    const ranked = [...rows].sort((left, right) => {
      const leftFav = followed.includes(left.slug) ? 0 : 1;
      const rightFav = followed.includes(right.slug) ? 0 : 1;
      if (leftFav !== rightFav) return leftFav - rightFav;
      return (left.display_priority || 200) - (right.display_priority || 200);
    });
    return ranked;
  }, [favorites]);

  const dateChips = [
    { id: addLocalDays(today, -1), label: t("live.yesterday") },
    { id: today, label: t("live.today") },
    { id: addLocalDays(today, 1), label: t("live.tomorrow") },
  ];

  function updateParams(patch) {
    const next = {
      status,
      date,
      sport,
      competition,
      ...patch,
    };
    const params = {};
    if (next.status && next.status !== "live") params.status = next.status;
    if (next.status !== "live" && next.date) params.date = next.date;
    else if (next.date && next.date !== today) params.date = next.date;
    if (next.sport && next.sport !== "all") params.sport = next.sport;
    if (next.competition) params.competition = next.competition;
    setSearchParams(params);
  }

  const fetchScores = useCallback(
    (silent = false) => {
      const filters = {};
      if (sport && sport !== "all" && sport !== "mine") filters.sport = sport;
      if (competition) filters.competition = competition;
      if (status !== "live") Object.assign(filters, localDayUtcBounds(date));
      const request =
        status === "finished"
          ? getSportsDataRecent(filters)
          : status === "upcoming"
            ? getSportsDataUpcoming(filters)
            : getSportsDataLive(filters);
      if (!silent) setLoading(true);
      request
        .then((data) => {
          setPayload(data);
          setError(false);
        })
        .catch(() => {
          setError(true);
          if (!silent) setPayload(null);
        })
        .finally(() => setLoading(false));
    },
    [competition, date, sport, status]
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

  const pollMs = status === "live" ? 30000 : 180000;
  const silentRefresh = useCallback(() => fetchScores(true), [fetchScores]);
  useVisiblePoll(silentRefresh, pollMs);

  const events = (() => {
    let rows = payloadEvents(payload);
    if (status !== "live") {
      rows = rows.filter((event) => eventLocalDateKey(event) === date);
    }
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
  })();

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
      <h1>{t("liveScores")}</h1>
      <div className="score-toolbar" role="tablist" aria-label={t("liveScores")}>
        {STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === status ? "tab is-active" : "tab"}
            onClick={() => updateParams({ status: item.id, date: item.id === "live" ? date : date || today })}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>
      <div className="score-toolbar">
        {dateChips.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === date ? "tab is-active" : "tab"}
            onClick={() => updateParams({ date: item.id, status: status === "live" ? "upcoming" : status })}
          >
            {item.label}
          </button>
        ))}
        <label className="date-field">
          {t("live.date")}
          <input
            type="date"
            value={date}
            onChange={(event) =>
              updateParams({
                date: event.target.value,
                status: status === "live" ? "upcoming" : status,
              })
            }
          />
        </label>
      </div>
      <div className="score-toolbar score-sports">
        <button
          type="button"
          className={sport === "all" ? "tab is-active" : "tab"}
          onClick={() => updateParams({ sport: "all", competition: "" })}
        >
          {t("live.allSports")}
        </button>
        <button
          type="button"
          className={sport === "mine" ? "tab is-active" : "tab"}
          onClick={() => updateParams({ sport: "mine", competition: "" })}
        >
          {t("live.mySports")}
        </button>
        {sports.map((item) => (
          <button
            key={item.slug}
            type="button"
            className={item.slug === sport ? "tab is-active" : "tab"}
            onClick={() => updateParams({ sport: item.slug, competition: "" })}
          >
            {t(sportI18nKey(item.slug) || "sport.label")}
          </button>
        ))}
      </div>
      {loading && !payload ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <EmptyState
          title={t("live.unavailableTitle")}
          body={t("live.unavailableBody")}
          action={
            <button type="button" className="btn" onClick={() => fetchScores(false)}>
              {t("live.retry")}
            </button>
          }
        />
      ) : payload && payload.connected === false ? (
        <ProviderPending title={t("live.readyTitle")} body={t("live.readyBody")} />
      ) : events.length ? (
        <EventList events={events} />
      ) : (
        <EmptyState title={emptyTitle} body={emptyBody} />
      )}
    </div>
  );
}
