import React, { useEffect, useMemo, useState } from "react";
import { getScores } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import { eventDateKey, isoDate, normalizeEvent } from "../lib/sportsData.js";
import ProviderPending from "../components/ProviderPending.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LiveScoresRail from "../components/LiveScoresRail.jsx";

export default function LiveScoresPage() {
  const { t } = useI18n();
  const [view, setView] = useState("live");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState(null);
  const [sport, setSport] = useState("football");

  useEffect(() => {
    setPageSeo({
      title: `${t("liveScores")} | NinkoSports`,
      description: t("live.readyBody"),
      path: "/live-scores",
    });
    getScores().then(setStatus).catch(() => setStatus({ connected: false }));
  }, [t]);

  const views = [
    { id: "live", label: t("live.now") },
    { id: "today", label: t("live.today") },
    { id: "tomorrow", label: t("live.tomorrow") },
    { id: "finished", label: t("live.finished") },
  ];
  const sports = [
    { id: "football", label: t("sport.football") },
    { id: "basketball", label: t("sport.basketball") },
    { id: "tennis", label: t("sport.tennis") },
    { id: "other", label: t("sport.other") },
  ];

  const events = useMemo(() => {
    const raw = status?.events?.length ? status.events : status?.matches || [];
    return raw.map(normalizeEvent).filter(Boolean);
  }, [status]);

  const filtered = events.filter((match) => {
    if (sport && sport !== "other" && match.sport && match.sport !== sport) return false;
    if (sport === "other" && ["football", "basketball", "tennis"].includes(match.sport)) {
      return false;
    }
    if (date && eventDateKey(match) !== date) return false;
    if (view === "live") return match.live || match.status === "live";
    if (view === "today") {
      return match.when === "today" || eventDateKey(match) === isoDate(new Date());
    }
    if (view === "tomorrow") {
      const next = new Date();
      next.setDate(next.getDate() + 1);
      return match.when === "tomorrow" || eventDateKey(match) === isoDate(next);
    }
    if (view === "finished") {
      return ["finished", "ft", "final", "ended"].includes(String(match.status || "").toLowerCase());
    }
    return true;
  });

  const connected = Boolean(status?.connected);

  return (
    <div className="page-scores">
      <h1>{t("liveScores")}</h1>
      <div className="score-toolbar">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === view ? "tab is-active" : "tab"}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
        <label className="date-field">
          {t("live.date")}
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      </div>
      <div className="score-toolbar">
        {sports.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === sport ? "tab is-active" : "tab"}
            onClick={() => setSport(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {!connected ? (
        <ProviderPending title={t("live.readyTitle")} body={t("live.readyBody")} />
      ) : filtered.length ? (
        <LiveScoresRail
          scores={{ connected: true, matches: filtered }}
          rows={filtered}
          title={views.find((item) => item.id === view)?.label}
        />
      ) : (
        <EmptyState title={t("live.emptyTitle")} body={t("live.emptyBody")} />
      )}
    </div>
  );
}
