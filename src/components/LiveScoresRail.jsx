import React from "react";
import { useI18n } from "../context/I18nContext.jsx";
import { normalizeEvent } from "../lib/sportsData.js";
import EventRow from "./scores/EventRow.jsx";

export function hasLiveUtilityData(scores, live = [], today = [], upcoming = []) {
  const connected =
    scores?.connected && Array.isArray(scores.matches) ? scores.matches : [];
  const events = Array.isArray(scores?.events) ? scores.events : [];
  return Boolean(
    (live && live.length) ||
      (today && today.length) ||
      (upcoming && upcoming.length) ||
      connected.length ||
      events.length
  );
}

function MatchRow({ match }) {
  const event = normalizeEvent(match) || match;
  return <EventRow event={event} compact />;
}

export default function LiveScoresRail({
  scores,
  live = [],
  today = [],
  upcoming = [],
  rows = null,
  title,
}) {
  const { t } = useI18n();
  if (!rows?.length && !hasLiveUtilityData(scores, live, today, upcoming)) return null;
  const connectedMatches =
    scores?.connected && Array.isArray(scores.matches) ? scores.matches : [];
  const liveRows = live.length ? live : connectedMatches.filter((item) => item.live || item.status === "live");
  const todayRows = today.length ? today : connectedMatches.filter((item) => item.when === "today");
  const upcomingRows = upcoming.length
    ? upcoming
    : connectedMatches.filter((item) => item.when === "upcoming");
  const sections = rows
    ? [{ key: "selected", title: title || t("liveScores"), rows }]
    : [
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
