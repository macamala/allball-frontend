import React from "react";
import { useI18n } from "../context/I18nContext.jsx";

export function hasLiveUtilityData(scores, live = [], today = [], upcoming = []) {
  const connected =
    scores?.connected && Array.isArray(scores.matches) ? scores.matches : [];
  return Boolean(
    (live && live.length) ||
      (today && today.length) ||
      (upcoming && upcoming.length) ||
      connected.length
  );
}

function MatchRow({ match }) {
  const home = match.home || match.home_team || "";
  const away = match.away || match.away_team || "";
  const score =
    match.score ||
    (match.home_score != null && match.away_score != null
      ? `${match.home_score}–${match.away_score}`
      : "");
  const status = match.status || match.minute || match.kickoff || "";
  return (
    <li className="live-match">
      <span className="live-match-comp">{match.competition || match.league || ""}</span>
      <span className="live-match-teams">
        {home} {score ? score : "v"} {away}
      </span>
      {status ? <span className="live-match-status">{status}</span> : null}
    </li>
  );
}

export default function LiveScoresRail({
  scores,
  live = [],
  today = [],
  upcoming = [],
}) {
  const { t } = useI18n();
  if (!hasLiveUtilityData(scores, live, today, upcoming)) return null;
  const connectedMatches =
    scores?.connected && Array.isArray(scores.matches) ? scores.matches : [];
  const liveRows = live.length ? live : connectedMatches.filter((item) => item.live || item.status === "live");
  const todayRows = today.length ? today : connectedMatches.filter((item) => item.when === "today");
  const upcomingRows = upcoming.length
    ? upcoming
    : connectedMatches.filter((item) => item.when === "upcoming");
  const sections = [
    { key: "live", title: t("live.now"), rows: liveRows },
    { key: "today", title: t("live.today"), rows: todayRows },
    { key: "upcoming", title: t("live.upcoming"), rows: upcomingRows },
  ].filter((item) => item.rows.length > 0);

  if (!sections.length) return null;

  return (
    <div className="live-utility-rails">
      {sections.map((section) => (
        <section key={section.key} className="rail-module live-rail" aria-label={section.title}>
          <h2 className="rail-title">{section.title}</h2>
          <ul className="rail-list">
            {section.rows.slice(0, 8).map((match) => (
              <MatchRow key={match.id || match.title} match={match} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
