import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext.jsx";
import {
  eventPath,
  formatEventTime,
  isLiveStatus,
  participantName,
} from "../../lib/sportsData.js";
import {
  eventTitle,
  namedField,
  namedLeader,
  pairScoreText,
  rendererForEvent,
  sportScoreText,
  statusLabel,
} from "../../lib/scorePresentation.js";
import Crest from "./Crest.jsx";
import { flagEmoji, sideCountry } from "../../lib/identityAssets.js";

function StatusCell({ event, t, locale }) {
  const time = formatEventTime(event, locale);
  const label = statusLabel(event, t, time);
  const live = isLiveStatus(event.status);
  return (
    <div className={`score-status-col ${live ? "is-live" : ""}`}>
      {live ? <span className="live-dot" aria-hidden="true" /> : null}
      <span className="score-status-text">{label}</span>
    </div>
  );
}

function PairNames({ left, right, event }) {
  const leftFlag = flagEmoji(sideCountry(left, event.country_id));
  const rightFlag = flagEmoji(sideCountry(right, event.country_id));
  return (
    <>
      <div className="score-team is-home">
        <Crest side={left} />
        <span className="score-name">
          {leftFlag ? <span className="score-flag">{leftFlag}</span> : null}
          {participantName(left) || "—"}
        </span>
      </div>
      <div className="score-mid" aria-hidden={!sportScoreText(event)}>
        {isLiveStatus(event.status) || pairScoreText(event) !== "–" ? sportScoreText(event) : "–"}
      </div>
      <div className="score-team is-away">
        <span className="score-name">
          {participantName(right) || "—"}
          {rightFlag ? <span className="score-flag">{rightFlag}</span> : null}
        </span>
        <Crest side={right} />
      </div>
    </>
  );
}

function TeamMatchBody({ event, t, locale }) {
  return (
    <>
      <StatusCell event={event} t={t} locale={locale} />
      <PairNames left={event.home} right={event.away} event={event} />
    </>
  );
}

function HeadToHeadBody({ event, t, locale }) {
  return (
    <>
      <StatusCell event={event} t={t} locale={locale} />
      <PairNames
        left={event.participant_a?.name ? event.participant_a : event.home}
        right={event.participant_b?.name ? event.participant_b : event.away}
        event={event}
      />
    </>
  );
}

function MetaEventBody({ event, t, locale, extra }) {
  const names = namedField(
    event.athletes || event.runners || event.classification || event.leaderboard,
    3
  );
  const leader = namedLeader(event);
  return (
    <>
      <StatusCell event={event} t={t} locale={locale} />
      <div className="score-meta-main">
        <div className="score-race-title">{eventTitle(event)}</div>
        {extra ? <div className="score-row-note">{extra}</div> : null}
        {leader ? <div className="score-row-note">{leader}</div> : null}
        {!leader && names.length ? <div className="score-row-note">{names.join(" · ")}</div> : null}
      </div>
    </>
  );
}

function EventBody({ event, t, locale }) {
  const kind = rendererForEvent(event);
  if (kind === "HEAD_TO_HEAD") return <HeadToHeadBody event={event} t={t} locale={locale} />;
  if (kind === "RACE") {
    const extra = [
      event.session_type,
      event.race_number ? `${t("live.round")} ${event.race_number}` : "",
      event.stage,
    ]
      .filter(Boolean)
      .join(" · ");
    return <MetaEventBody event={event} t={t} locale={locale} extra={extra} />;
  }
  if (kind === "MEET" || kind === "MULTI_EVENT_MEET") {
    const extra = [event.session_type, event.round, event.stage].filter(Boolean).join(" · ");
    return <MetaEventBody event={event} t={t} locale={locale} extra={extra} />;
  }
  if (kind === "TOURNAMENT") {
    const extra = [event.round, event.stage].filter(Boolean).join(" · ");
    return <MetaEventBody event={event} t={t} locale={locale} extra={extra} />;
  }
  if (kind === "BRACKET") {
    const extra = [event.round, event.best_of ? `Bo${event.best_of}` : ""].filter(Boolean).join(" · ");
    if (participantName(event.home) && participantName(event.away)) {
      return <TeamMatchBody event={event} t={t} locale={locale} />;
    }
    return <MetaEventBody event={event} t={t} locale={locale} extra={extra} />;
  }
  if (kind === "UNKNOWN") {
    return <MetaEventBody event={event} t={t} locale={locale} extra={event.event_family || ""} />;
  }
  return <TeamMatchBody event={event} t={t} locale={locale} />;
}

export default function EventRow({ event, compact = false }) {
  const { t, dateLocale } = useI18n();
  if (!event?.id) return null;
  const kind = rendererForEvent(event);
  const className = [
    "score-row",
    compact ? "is-compact" : "",
    isLiveStatus(event.status) ? "is-live" : "",
    `is-${kind.toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <li className={className} data-renderer={kind}>
      <Link to={eventPath(event.id)} state={{ event }} className="score-row-link">
        <EventBody event={event} t={t} locale={dateLocale} />
      </Link>
    </li>
  );
}
