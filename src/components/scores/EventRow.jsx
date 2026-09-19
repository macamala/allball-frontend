import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext.jsx";
import {
  eventPath,
  formatEventTime,
  isFinishedStatus,
  participantLogo,
  participantName,
  scoreLine,
} from "../../lib/sportsData.js";

function Logo({ side }) {
  const src = participantLogo(side);
  if (!src) return null;
  return <img className="score-logo" src={src} alt="" width="20" height="20" />;
}

function PairRow({ event, left, right, showScore, timeLabel, statusLabel }) {
  const leftName = participantName(left);
  const rightName = participantName(right);
  const score = showScore ? scoreLine(event) : "";
  return (
    <>
      <div className="score-pair">
        <span className="score-side">
          <Logo side={left} />
          <span className="score-name">{leftName || "—"}</span>
          {showScore && score ? <span className="score-num">{event.score?.home}</span> : null}
        </span>
        <span className="score-side is-away">
          {showScore && score ? <span className="score-num">{event.score?.away}</span> : null}
          <span className="score-name">{rightName || "—"}</span>
          <Logo side={right} />
        </span>
      </div>
      <div className="score-row-meta">
        {statusLabel ? <span className="score-status">{statusLabel}</span> : null}
        {timeLabel ? <span className="score-time">{timeLabel}</span> : null}
        {event.round ? <span className="score-round">{event.round}</span> : null}
      </div>
    </>
  );
}

function namedItems(list) {
  return (list || [])
    .map((item) => (typeof item === "string" ? item : item?.name || item?.driver || ""))
    .filter(Boolean)
    .slice(0, 4);
}

function EventBody({ event, locale, t }) {
  const live = event.live;
  const finished = isFinishedStatus(event.status);
  const timeLabel = live || finished ? "" : formatEventTime(event, locale);
  const statusLabel = live
    ? t("live.now")
    : finished
      ? t("live.finished")
      : event.status && event.status !== "scheduled"
        ? event.status.replace(/_/g, " ")
        : "";
  const showScore = live || finished || scoreLine(event);
  const type = event.event_type || "TEAM_MATCH";

  if (type === "RACE" || type === "MEET" || type === "MULTI_EVENT_MEET") {
    const title =
      event.tournament ||
      participantName(event.home) ||
      event.session_type ||
      event.competition;
    const names = namedItems(event.athletes || event.runners || event.classification);
    return (
      <>
        <div className="score-race-title">{title}</div>
        {event.race_number ? (
          <div className="score-row-meta">
            {t("live.round")} {event.race_number}
          </div>
        ) : null}
        {names.length ? <p className="score-athletes">{names.join(" · ")}</p> : null}
        <div className="score-row-meta">
          {statusLabel ? <span className="score-status">{statusLabel}</span> : null}
          {timeLabel ? <span className="score-time">{timeLabel}</span> : null}
          {event.stage && event.stage !== event.round ? (
            <span className="score-round">{event.stage}</span>
          ) : null}
        </div>
      </>
    );
  }

  if (type === "TOURNAMENT" || type === "BRACKET") {
    const names = namedItems(event.leaderboard || event.athletes);
    return (
      <>
        <div className="score-race-title">
          {event.tournament || participantName(event.home) || event.competition}
        </div>
        {names.length ? <p className="score-athletes">{names.join(" · ")}</p> : null}
        <div className="score-row-meta">
          {statusLabel ? <span className="score-status">{statusLabel}</span> : null}
          {timeLabel ? <span className="score-time">{timeLabel}</span> : null}
          {event.round ? <span className="score-round">{event.round}</span> : null}
        </div>
      </>
    );
  }

  return (
    <PairRow
      event={event}
      left={event.home}
      right={event.away}
      showScore={Boolean(showScore)}
      timeLabel={timeLabel}
      statusLabel={statusLabel}
    />
  );
}

export default function EventRow({ event, compact = false }) {
  const { t, dateLocale } = useI18n();
  if (!event?.id) return null;
  const className = [
    "score-row",
    compact ? "is-compact" : "",
    event.live ? "is-live" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <li className={className}>
      <Link to={eventPath(event.id)} className="score-row-link">
        <EventBody event={event} locale={dateLocale} t={t} />
      </Link>
    </li>
  );
}
