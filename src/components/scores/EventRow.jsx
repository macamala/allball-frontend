import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { eventPath, isConfirmedLive, participantName } from "../../lib/sportsData.js";
import {
  cricketScoreText,
  eventTitle,
  golfBoard,
  namedField,
  namedLeader,
  periodRows,
  rendererForEvent,
  scoreDisplay,
  sportScoreText,
  usesPeriodGrid,
  winningSide,
} from "../../lib/scorePresentation.js";
import Crest from "./Crest.jsx";
import EventStatus from "./EventStatus.jsx";
import FavoriteButton from "./FavoriteButton.jsx";

function SideLine({ side, event, score, winner, align, periods = [] }) {
  const name = participantName(side, { sport: event.sport, competitionCountry: event.country_id }) || "—";
  return (
    <div className={`score-line is-${align} ${winner ? "is-winner" : ""}`}>
      <Crest side={side} />
      <span className="score-name">{name}</span>
      {periods.length ? (
        <span className="score-sets" aria-label="Period scores">
          {periods.map((value, index) => (
            <span key={index} className="score-set">{scoreDisplay(value)}</span>
          ))}
        </span>
      ) : null}
      <span className="score-mid">{score}</span>
    </div>
  );
}

function PairBody({ event, left, right }) {
  const winner = winningSide(event);
  const periods = usesPeriodGrid(event) ? periodRows(event) : [];
  const homePeriods = periods.map((item) => item.home);
  const awayPeriods = periods.map((item) => item.away);
  const cricket = event.sport === "cricket";

  if (cricket && (event.score?.runs != null || event.score?.wickets != null)) {
    return (
      <div className="score-pair-stack">
        <SideLine side={left} event={event} score={cricketScoreText(event)} winner={winner === "home"} align="home" />
        <SideLine side={right} event={event} score="" winner={winner === "away"} align="away" />
      </div>
    );
  }

  return (
    <div className="score-pair-stack">
      <SideLine
        side={left}
        event={event}
        score={scoreDisplay(event.score?.home)}
        winner={winner === "home"}
        align="home"
        periods={homePeriods}
      />
      <SideLine
        side={right}
        event={event}
        score={scoreDisplay(event.score?.away)}
        winner={winner === "away"}
        align="away"
        periods={awayPeriods}
      />
    </div>
  );
}

function MetaBody({ event, extra }) {
  const names = namedField(event.athletes || event.runners || event.classification || event.leaderboard, 3);
  const leader = namedLeader(event);
  const golf = golfBoard(event);
  if (event.sport === "golf" && golf.length) {
    return (
      <div className="score-golf">
        {golf.map((row) => (
          <div className="score-golf-row" key={`${row.position}-${row.name}`}>
            <span className="score-golf-pos">{row.position}</span>
            <span className="score-name">{row.name}</span>
            <span className="score-mid">{row.total === "" ? "–" : row.total}</span>
            <span className="score-golf-thru">{row.thru === "" ? "" : row.thru}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="score-meta-main">
      <div className="score-race-title">{eventTitle(event)}</div>
      {extra ? <div className="score-row-note">{extra}</div> : null}
      {leader ? <div className="score-row-note">{leader}</div> : null}
      {!leader && names.length ? <div className="score-row-note">{names.join(" · ")}</div> : null}
      {sportScoreText(event) && sportScoreText(event) !== "–" && !leader ? (
        <div className="score-mid is-meta">{sportScoreText(event)}</div>
      ) : null}
    </div>
  );
}

function EventBody({ event, t, locale }) {
  const kind = rendererForEvent(event);
  const left = event.participant_a?.name ? event.participant_a : event.home;
  const right = event.participant_b?.name ? event.participant_b : event.away;
  return (
    <>
      <EventStatus event={event} t={t} locale={locale} />
      {kind === "RACE" ? (
        <MetaBody
          event={event}
          extra={[event.session_type, event.race_number ? `${t("live.round")} ${event.race_number}` : "", event.stage]
            .filter(Boolean)
            .join(" · ")}
        />
      ) : kind === "MEET" || kind === "MULTI_EVENT_MEET" || kind === "TOURNAMENT" ? (
        participantName(event.home) && participantName(event.away) ? (
          <PairBody event={event} left={left} right={right} />
        ) : (
          <MetaBody event={event} extra={[event.round, event.stage].filter(Boolean).join(" · ")} />
        )
      ) : kind === "UNKNOWN" ? (
        <MetaBody event={event} extra="" />
      ) : (
        <PairBody event={event} left={left} right={right} />
      )}
    </>
  );
}

function eventFavoriteKey(event) {
  return String(event.home?.id || event.home?.slug || event.away?.id || event.away?.slug || event.id || "");
}

function EventRowInner({ event, compact = false }) {
  const { t, dateLocale } = useI18n();
  const { favorites, syncFavorites } = useAuth();
  if (!event?.id) return null;
  const kind = rendererForEvent(event);
  const live = isConfirmedLive(event);
  const favKey = eventFavoriteKey(event);
  const pressed = (favorites?.teams || []).includes(favKey);
  const className = [
    "score-row",
    compact ? "is-compact" : "",
    live ? "is-live" : "",
    `is-${kind.toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(" ");

  const toggleFav = useCallback(
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!favKey) return;
      const teams = pressed
        ? (favorites.teams || []).filter((item) => item !== favKey)
        : [...(favorites.teams || []), favKey];
      syncFavorites({ ...favorites, teams });
    },
    [favKey, favorites, pressed, syncFavorites]
  );

  return (
    <li className={className} data-renderer={kind}>
      <div className="score-row-frame">
        <FavoriteButton
          pressed={pressed}
          label={pressed ? t("live.unfollowEvent") : t("live.followEvent")}
          onClick={toggleFav}
        />
        <Link className="score-row-link" to={eventPath(event.id)} state={{ event }}>
          <EventBody event={event} t={t} locale={dateLocale} />
          <span className="score-chevron" aria-hidden="true">›</span>
        </Link>
      </div>
    </li>
  );
}

const EventRow = React.memo(EventRowInner);
export default EventRow;
