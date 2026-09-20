import React, { useCallback, useState } from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { isConfirmedLive, participantName } from "../../lib/sportsData.js";
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
import QuickEventDetail from "./QuickEventDetail.jsx";
import { flagEmoji, sideCountry } from "../../lib/identityAssets.js";

function SideLine({ side, event, score, winner, align }) {
  const name = participantName(side) || "—";
  const flag = flagEmoji(sideCountry(side, event.country_id));
  return (
    <div className={`score-line is-${align} ${winner ? "is-winner" : ""}`}>
      <Crest side={side} />
      <span className="score-name">
        {flag ? <span className="score-flag">{flag}</span> : null}
        {name}
      </span>
      <span className="score-mid">{score}</span>
    </div>
  );
}

function PeriodGrid({ event, left, right }) {
  const sets = periodRows(event);
  const winner = winningSide(event);
  return (
    <div className="score-period-grid">
      {[
        { side: left, key: "home", align: "home" },
        { side: right, key: "away", align: "away" },
      ].map((row) => (
        <div key={row.key} className={`score-line is-${row.align} ${winner === row.key ? "is-winner" : ""}`}>
          <Crest side={row.side} />
          <span className="score-name">{participantName(row.side) || "—"}</span>
          <span className="score-sets">
            <span className="score-mid">{scoreDisplay(event.score?.[row.key])}</span>
            {sets.map((item, index) => (
              <span key={index} className="score-set">
                {scoreDisplay(item[row.key])}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function PairBody({ event, left, right }) {
  const winner = winningSide(event);
  if (usesPeriodGrid(event)) {
    return <PeriodGrid event={event} left={left} right={right} />;
  }
  const cricket = event.sport === "cricket";
  if (cricket && (event.score?.runs != null || event.score?.wickets != null)) {
    return (
      <div className="score-meta-main">
        <SideLine side={left} event={event} score={cricketScoreText(event)} winner={winner === "home"} align="home" />
        <SideLine side={right} event={event} score="" winner={winner === "away"} align="away" />
      </div>
    );
  }
  return (
    <div className="score-pair">
      <SideLine
        side={left}
        event={event}
        score={scoreDisplay(event.score?.home)}
        winner={winner === "home"}
        align="home"
      />
      <SideLine
        side={right}
        event={event}
        score={scoreDisplay(event.score?.away)}
        winner={winner === "away"}
        align="away"
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
  const [open, setOpen] = useState(false);
  if (!event?.id) return null;
  const kind = rendererForEvent(event);
  const live = isConfirmedLive(event);
  const favKey = eventFavoriteKey(event);
  const pressed = (favorites?.teams || []).includes(favKey);
  const className = [
    "score-row",
    compact ? "is-compact" : "",
    live ? "is-live" : "",
    open ? "is-open" : "",
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
        <button
          type="button"
          className="score-row-link"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <EventBody event={event} t={t} locale={dateLocale} />
          <span className="score-chevron" aria-hidden="true">
            {open ? "▾" : "›"}
          </span>
        </button>
      </div>
      {open ? <QuickEventDetail event={event} onClose={() => setOpen(false)} /> : null}
    </li>
  );
}

const EventRow = React.memo(EventRowInner);
export default EventRow;
