import React, { useEffect, useState } from "react";
import { getScores } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import ProviderPending from "../components/ProviderPending.jsx";
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
  ];
  const sports = [
    { id: "football", label: t("sport.football") },
    { id: "basketball", label: t("sport.basketball") },
    { id: "tennis", label: t("sport.tennis") },
    { id: "other", label: t("sport.other") },
  ];
  const connected = Boolean(status?.connected && (status.matches || []).length);
  const filtered = (status?.matches || []).filter((match) => {
    if (sport && match.sport && match.sport !== sport) return false;
    if (view === "live") return match.live || match.status === "live";
    if (view === "today") return match.when === "today";
    if (view === "tomorrow") return match.when === "tomorrow";
    return true;
  });

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
      {connected ? (
        <LiveScoresRail scores={{ connected: true, matches: filtered }} />
      ) : (
        <ProviderPending title={t("live.readyTitle")} body={t("live.readyBody")} />
      )}
    </div>
  );
}
