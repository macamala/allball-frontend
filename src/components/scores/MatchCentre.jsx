import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { matchSectionFromHash } from "../../lib/standingsGroups.js";
import StandingsTable from "../StandingsTable.jsx";
import MatchSectionTabs from "./MatchSectionTabs.jsx";
import Crest from "./Crest.jsx";
import FavoriteButton from "./FavoriteButton.jsx";
import { useI18n } from "../../context/I18nContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { competitionPresentation } from "../../lib/competitionPresentation.js";
import { competitionLabel } from "../../labels.js";
import {
  formatEventDateTime,
  formatEventTime,
  isConfirmedLive,
  isFinishedStatus,
  eventPath,
  participantName,
  playerProfilePath,
  teamProfilePath,
} from "../../lib/sportsData.js";
import {
  eventTitle,
  formatPairScore,
  namedField,
  rendererForEvent,
  sportScoreText,
  statusLabel,
} from "../../lib/scorePresentation.js";
import {
  AflScore,
  ClassificationTable,
  Games,
  Innings,
  PlayerTable,
  Rubbers,
  RugbyScore,
  Scorecard,
  ShotList,
  classificationColumns,
  cricketInnings,
  formatDuration,
  meetingRubbers,
  rugbyScoring,
  scorecardTables,
  seriesGames,
} from "./nativeSections.jsx";
import { scopedCompetitionId } from "../../config/sports.js";
import { flagImageUrl } from "../../lib/identityAssets.js";
import CountryFlag from "./CountryFlag.jsx";
import { normalizeAssetUrl } from "../../lib/assetUrls.js";
import { getRegistrySport } from "../../config/sportsRegistry.js";

function competitionHead(event) {
  const presented = competitionPresentation(event);
  const name = presented.displayName || competitionLabel(event.competition);
  return {
    kicker: presented.kicker,
    name,
    countryId: presented.countryId,
    showFlag: presented.showFlag,
    logo: normalizeAssetUrl(event.competition_logo),
  };
}

function CompetitionHeroIdentity({ presented }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [presented.logo]);
  const flag = presented.showFlag && flagImageUrl(presented.countryId) ? presented.countryId : "";
  const logo = presented.logo && !failed ? presented.logo : "";
  return (
    <div className="mc-comp-identity" aria-hidden="true">
      {flag ? <CountryFlag countryId={flag} className="mc-comp-flag" size={24} /> : null}
      {logo ? (
        <img
          className="mc-comp-logo"
          src={logo}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="mc-comp-logo-missing" data-asset-missing="competition-logo">◆</span>
      )}
    </div>
  );
}

function usefulNumber(value) {
  return value !== null && value !== undefined && value !== "";
}

function setTable(event) {
  const periods = event?.periods || event?.innings || event?.score?.sets || event?.score?.periods;
  if (!Array.isArray(periods) || !periods.length) return null;
  const rows = periods
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      if (row.home == null && row.away == null) return null;
      return {
        home: row.home ?? row.a,
        away: row.away ?? row.b,
        label: row.label || row.code || row.number || index + 1,
      };
    })
    .filter((row) => row && (row.home != null || row.away != null));
  return rows.length ? rows : null;
}

function timelineItems(event, data) {
  const raw = data?.timeline || data?.incidents || event.timeline || event.incidents;
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
}

function statisticsRows(event, data) {
  const raw = data?.statistics || event.statistics;
  if (!Array.isArray(raw)) return [];
  return raw.filter((row) => {
    if (!row) return false;
    if (usefulNumber(row.home) || usefulNumber(row.away)) {
      if (row.home === 0 && row.away === 0 && row.unknown) return false;
      return true;
    }
    return row.value != null && row.value !== "";
  });
}

function lineupsShape(event, data) {
  const raw = data?.lineups || event.lineups;
  if (!raw) return null;
  if (raw.home || raw.away) {
    const home = raw.home || {};
    const away = raw.away || {};
    if (!(home.start || []).length && !(away.start || []).length && !(home.bench || []).length && !(away.bench || []).length) {
      return null;
    }
    return raw;
  }
  if (Array.isArray(raw) && raw.length) return raw;
  return null;
}

function ParticipantBlock({ side, event, align, onSelect }) {
  const name = participantName(side, { sport: event.sport, competitionCountry: event.country_id }) || "—";
  return (
    <button
      type="button"
      className={`mc-player is-${align} mc-entity-trigger`}
      onClick={() => onSelect?.({ kind: "team", entity: side, name, event })}
      aria-label={`Open ${name} details`}
    >
      <Crest side={side} fallbackCountry={event.scope_type !== "DOMESTIC" ? name : ""} size={48} />
      <strong>{name}</strong>
    </button>
  );
}

function PairScoreboard({ event, t, locale, favorite, onParticipantSelect }) {
  const presented = competitionHead(event);
  const live = isConfirmedLive(event);
  const finished = isFinishedStatus(event.status);
  const time = formatEventTime(event, locale);
  const meeting = event.sport === "table-tennis" && event.sport_detail?.meeting;
  const score =
    live || finished
      ? event.sport === "volleyball" || meeting
        ? formatPairScore(event.score?.home, event.score?.away)
        : sportScoreText(event)
      : t("predictions.vs");
  const stamp = formatEventDateTime(event, locale);
  const detail = event.sport_detail || {};
  const clock = event.score?.clock || event.score?.minute || detail.clock || detail.minute;
  return (
    <header className={`mc-hero ${live ? "is-live" : ""} ${finished ? "is-finished" : ""}`}>
      <CompetitionHeroIdentity presented={presented} />
      {presented.kicker ? <p className="mc-geo">{presented.kicker}</p> : null}
      <p className="mc-kicker">
        {presented.name}
        {event.round ? ` · ${event.round}` : ""}
      </p>
      <div className="mc-board">
        <ParticipantBlock side={event.home} event={event} align="home" onSelect={onParticipantSelect} />
        <div className="mc-score">
          <div className="mc-score-value">{score}</div>
          <div className={`mc-score-status ${live ? "is-live" : ""}`}>{statusLabel(event, t, time)}</div>
          {clock != null && clock !== "" && live ? <div className="mc-score-status is-live">{String(clock).replace(/'$/, "")}’</div> : null}
        </div>
        <ParticipantBlock side={event.away} event={event} align="away" onSelect={onParticipantSelect} />
      </div>
      {!live && stamp ? <p className="mc-when">{stamp}</p> : null}
      {favorite}
    </header>
  );
}

function MetaScoreboard({ event, t, locale, favorite }) {
  const presented = competitionHead(event);
  const live = isConfirmedLive(event);
  const stamp = formatEventDateTime(event, locale);
  const names = namedField(event.classification || event.leaderboard || event.runners || event.athletes, 8);
  return (
    <header className={`mc-hero is-meta ${live ? "is-live" : ""}`}>
      <CompetitionHeroIdentity presented={presented} />
      {presented.kicker ? <p className="mc-geo">{presented.kicker}</p> : null}
      <p className="mc-kicker">{presented.name}</p>
      <h2 className="mc-event-title">{eventTitle(event)}</h2>
      <div className={`mc-score-status ${live ? "is-live" : ""}`}>
        {statusLabel(event, t, formatEventTime(event, locale))}
      </div>
      {stamp ? <p className="mc-when">{stamp}</p> : null}
      {event.session_type || event.stage || event.race_number ? (
        <p className="mc-when">
          {[event.session_type, event.stage, event.race_number ? `${t("live.round")} ${event.race_number}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      {event.winner ? (
        <p className="mc-when">
          {t("match.winner")}: {event.winner}
        </p>
      ) : null}
      {names.length ? (
        <ol className="mc-leader">
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ol>
      ) : null}
      {favorite}
    </header>
  );
}

function InfoRows({ event, t }) {
  const detail = event.sport_detail || {};
  const rows = [
    event.venue ? [t("match.venue"), event.venue] : null,
    event.season ? [t("match.season"), event.season] : null,
    event.round ? [t("live.round"), event.round] : null,
    event.surface || detail.surface ? ["Surface", event.surface || detail.surface] : null,
    event.series_id ? [t("match.series"), event.series_id] : null,
    event.session_type ? [t("match.session"), event.session_type] : null,
    event.attendance != null && event.attendance !== "" ? [t("match.attendance"), event.attendance] : null,
    event.referee ? [t("match.referee"), event.referee] : null,
    event.best_of ? [t("match.series"), `BO${event.best_of}`] : null,
    event.winner ? [t("match.winner"), event.winner] : null,
    event.game_id ? [t("match.game"), event.game_id] : null,
    usefulNumber(detail.inning) ? [t("match.innings"), `${detail.inning_half || ""} ${detail.inning}`.trim()] : null,
    usefulNumber(detail.outs) ? ["Outs", detail.outs] : null,
    detail.batter ? ["Batter", detail.batter] : null,
    detail.pitcher ? ["Pitcher", detail.pitcher] : null,
    usefulNumber(detail.duration) ? ["Duration", formatDuration(detail.duration)] : null,
    event.serving ? ["Serve", event.serving] : null,
  ].filter(Boolean);
  if (!rows.length) return null;
  return (
    <section className="mc-card">
      <h2>{t("match.details")}</h2>
      <dl className="mc-dl">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function periodBucket(item) {
  const minute = Number(item.minute);
  const period = String(item.period || "");
  if (period === "2" || period === "2nd" || (Number.isFinite(minute) && minute > 45)) return "second";
  return "first";
}

function timelineKind(row) {
  const value = String(row?.family || row?.type || "").toLowerCase();
  if (value.includes("goal")) return "goal";
  if (value.includes("red")) return "red-card";
  if (value.includes("yellow") || value.includes("card")) return "yellow-card";
  if (value.includes("sub")) return "substitution";
  if (value.includes("var")) return "var";
  return "event";
}

function TimelineEvent({ row, body, score }) {
  const kind = timelineKind(row);
  return (
    <span className="mc-timeline-event">
      <span className={`mc-event-icon is-${kind}`} aria-hidden="true">
        {kind === "goal" ? "●" : kind === "substitution" ? "↕" : kind === "var" ? "VAR" : ""}
      </span>
      <span className="mc-timeline-copy">{body || String(row?.description || row?.type || "").replace(/_/g, " ")}</span>
      {score ? <span className="mc-tl-score">{score}</span> : null}
    </span>
  );
}

function Timeline({ items, t }) {
  if (!items.length) return null;
  const first = items.filter((row) => periodBucket(row) === "first");
  const second = items.filter((row) => periodBucket(row) === "second");
  const groups = second.length
    ? [["first", first, t("match.firstHalf")], ["second", second, t("match.secondHalf")]]
    : [["all", items, t("match.timeline")]];
  return (
    <section className="mc-card mc-timeline-card">
      <h2>{t("match.timeline")}</h2>
      {groups.map(([key, rows, label]) => (
        <div key={key} className="mc-timeline-block">
          <h3 className="mc-timeline-label">{label}</h3>
          <ol className="mc-timeline">
            {rows.map((row, index) => {
              const score =
                row.score_after && (row.score_after.home != null || row.score_after.away != null)
                  ? `${row.score_after.home ?? ""}–${row.score_after.away ?? ""}`
                  : "";
              const body =
                row.family === "substitution" || row.type === "substitution"
                  ? [row.player_in, row.player_out ? `↓ ${row.player_out}` : ""].filter(Boolean).join(" ")
                  : [
                      row.player,
                      row.assist ? `(${row.assist})` : "",
                      row.type && row.family !== "goal" && !String(row.type).toLowerCase().includes("goal")
                        ? String(row.type).replace(/_/g, " ")
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
              const side = row.side === "away" ? "away" : row.side === "home" ? "home" : "neutral";
              const eventNode = <TimelineEvent row={row} body={body} score={score} />;
              return (
                <li className={`mc-timeline-item is-${side}`} key={row.id || `${row.minute}-${index}`}>
                  <span className="mc-timeline-side is-home">{side !== "away" ? eventNode : null}</span>
                  <span className="mc-minute">{row.minute != null ? `${row.minute}’` : ""}</span>
                  <span className="mc-timeline-side is-away">{side === "away" ? eventNode : null}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}

function statNumeric(value) {
  if (typeof value === "number") return value;
  if (value == null || value === "") return Number.NaN;
  const match = String(value).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

function footballStatGroup(row) {
  const label = String(row?.label || row?.name || "").toLowerCase();
  const exactKey = [
    "expected goals", "xg", "possession", "ball possession", "total shots", "shots on target",
    "shots on goal", "big chances", "corners", "corner kicks", "yellow cards", "red cards",
  ];
  if (exactKey.some((needle) => label === needle || label.startsWith(`${needle} (`) || label.includes(`${needle} (xg)`))) {
    return "Key stats";
  }
  if (/shot|xgot|woodwork|inside.*box|outside.*box|headed goal|goal attempt/.test(label)) return "Shots";
  if (/pass|cross|through ball|final third|long ball|throw-in|throw in|expected assist|\bxa\b/.test(label)) return "Passing";
  if (/save|goalkeeper|keeper|goals prevented|goal kick/.test(label)) return "Goalkeepers";
  if (/tackle|duel|clearance|interception|foul|error|blocked/.test(label)) return "Defense";
  if (/chance|corner|touch.*box|offside|free kick|attack|dangerous/.test(label)) return "Attack";
  return "Other";
}

function statisticGroups(rows, sport) {
  if (sport !== "football" || rows.length < 8) return [["Statistics", rows]];
  const order = ["Key stats", "Shots", "Attack", "Passing", "Defense", "Goalkeepers", "Other"];
  const buckets = new Map(order.map((name) => [name, []]));
  rows.forEach((row) => buckets.get(footballStatGroup(row))?.push(row));
  return order.map((name) => [name, buckets.get(name)]).filter(([, group]) => group?.length);
}

function StatRow({ row }) {
  const home = row.home;
  const away = row.away;
  const hNum = statNumeric(home);
  const aNum = statNumeric(away);
  const total = (Number.isFinite(hNum) ? Math.max(0, hNum) : 0) + (Number.isFinite(aNum) ? Math.max(0, aNum) : 0);
  const hShare = total > 0 && Number.isFinite(hNum) ? (Math.max(0, hNum) / total) * 100 : 0;
  const aShare = total > 0 && Number.isFinite(aNum) ? (Math.max(0, aNum) / total) * 100 : 0;
  return (
    <li>
      <div className="mc-stat-nums">
        <span className={hNum > aNum ? "is-leading" : ""}>{home ?? "–"}</span>
        <span className="mc-stat-label">{row.label || row.name}</span>
        <span className={aNum > hNum ? "is-leading" : ""}>{away ?? row.value ?? "–"}</span>
      </div>
      {Number.isFinite(hNum) && Number.isFinite(aNum) && total > 0 ? (
        <div className="mc-stat-bars" aria-hidden="true">
          <span className="mc-stat-track is-home"><span style={{ width: `${hShare}%` }} /></span>
          <span className="mc-stat-track is-away"><span style={{ width: `${aShare}%` }} /></span>
        </div>
      ) : null}
    </li>
  );
}

function StatCompare({ rows, t, sport, periods = {}, eventId }) {
  const [activePeriod, setActivePeriod] = useState("all");

  useEffect(() => {
    setActivePeriod("all");
  }, [eventId]);

  if (!rows.length) return null;
  const options = [
    ["all", "Match", Array.isArray(periods?.all) && periods.all.length ? periods.all : rows],
    ["first_half", t("match.firstHalf"), Array.isArray(periods?.first_half) ? periods.first_half : []],
    ["second_half", t("match.secondHalf"), Array.isArray(periods?.second_half) ? periods.second_half : []],
  ].filter(([, , values]) => values.length);
  const selected = options.find(([key]) => key === activePeriod) || options[0];
  const activeRows = selected?.[2] || rows;
  const groups = statisticGroups(activeRows, sport);

  return (
    <section className="mc-card mc-stats-card">
      <div className="mc-card-title-row">
        <h2>{t("predictions.statistics")}</h2>
        {options.length > 1 ? (
          <div className="mc-stat-periods" role="tablist" aria-label="Statistics period">
            {options.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected?.[0] === key}
                className={selected?.[0] === key ? "is-active" : ""}
                onClick={() => setActivePeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {groups.map(([label, group]) => (
        <div className="mc-stat-group" key={label}>
          {groups.length > 1 ? <h3>{label}</h3> : null}
          <ul className="mc-stats">
            {group.map((row, index) => <StatRow row={row} key={row.label || row.name || index} />)}
          </ul>
        </div>
      ))}
    </section>
  );
}

function playerImage(player) {
  return player?.image || player?.photo || player?.avatar || player?.image_url || player?.imageUrl || "";
}

function playerInitials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function PlayerAvatar({ player, compact = false }) {
  const [failed, setFailed] = useState(false);
  const src = playerImage(player);
  const number = player?.number != null && player?.number !== "" ? String(player.number) : "";
  return (
    <span className={`mc-player-avatar ${compact ? "is-compact" : ""}`}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="mc-player-avatar-fallback">{number || playerInitials(player?.name)}</span>
      )}
    </span>
  );
}

function formationRows(side) {
  const starters = Array.isArray(side?.start) ? side.start.filter((row) => row?.name) : [];
  if (!starters.length) return [];
  const counts = String(side?.formation || "")
    .match(/\d+/g)
    ?.map(Number)
    .filter((value) => value > 0);
  let bands = counts && counts.reduce((sum, value) => sum + value, 0) === starters.length - 1 ? [1, ...counts] : null;
  if (!bands) {
    if (starters.length >= 11) bands = [1, 4, 4, starters.length - 9];
    else if (starters.length >= 8) bands = [1, 3, 3, starters.length - 7];
    else if (starters.length >= 5) bands = [1, 2, starters.length - 3];
    else bands = [1, Math.max(1, starters.length - 1)];
  }
  const rows = [];
  let cursor = 0;
  bands.forEach((count) => {
    const row = starters.slice(cursor, cursor + count);
    if (row.length) rows.push(row);
    cursor += count;
  });
  if (cursor < starters.length) rows.push(starters.slice(cursor));
  return rows;
}

function teamAverageRating(side) {
  const values = (side?.start || [])
    .map((player) => Number(player?.rating))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return "";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function PitchPlayer({ player, onSelect }) {
  return (
    <button
      type="button"
      className="mc-pitch-player mc-entity-trigger"
      title={[player?.name, player?.position].filter(Boolean).join(" · ")}
      onClick={() => onSelect?.(player)}
      aria-label={`Open ${player?.name || "player"} details`}
    >
      <div className="mc-pitch-avatar-wrap">
        <PlayerAvatar player={player} />
        {player?.number != null && player?.number !== "" ? <span className="mc-shirt-number">{player.number}</span> : null}
      </div>
      <strong>{player?.name || "—"}{player?.captain ? <span className="mc-captain-mark">C</span> : null}</strong>
      {player?.rating != null && player?.rating !== "" ? <span className="mc-player-rating">{player.rating}</span> : null}
    </button>
  );
}

function StartingList({ side, label, onSelect }) {
  const starters = Array.isArray(side?.start) ? side.start.filter((row) => row?.name) : [];
  if (!starters.length) return null;
  return (
    <div className="mc-squad-block">
      <div className="mc-squad-title">
        <strong>{label}</strong>
        <span>Starting XI</span>
      </div>
      <ul className="mc-roster-list">
        {starters.map((player, index) => (
          <li key={player.id || player.name || index}>
            <button type="button" className="mc-roster-player-button" onClick={() => onSelect?.(player)}>
              <PlayerAvatar player={player} compact />
              <span className="mc-bench-number">{player.number ?? ""}</span>
              <span className="mc-bench-name">
                {player.name}
                {player.captain ? <span className="mc-list-captain">C</span> : null}
              </span>
              {player.position ? <span className="mc-bench-pos">{player.position}</span> : null}
              {player.rating != null && player.rating !== "" ? <span className="mc-bench-rating">{player.rating}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BenchList({ side, label, t, onSelect }) {
  const bench = Array.isArray(side?.bench) ? side.bench.filter((row) => row?.name) : [];
  if (!bench.length && !side?.coach) return null;
  return (
    <div className="mc-squad-block">
      <div className="mc-squad-title">
        <strong>{label}</strong>
        {side?.formation ? <span>{side.formation}</span> : null}
      </div>
      {side?.coach ? <p className="mc-coach">{t("match.coach")}: {side.coach}</p> : null}
      {bench.length ? (
        <>
          <h4>{t("match.bench")}</h4>
          <ul className="mc-bench-list">
            {bench.map((player, index) => (
              <li key={player.id || player.name || index}>
                <button type="button" className="mc-roster-player-button" onClick={() => onSelect?.(player)}>
                  <PlayerAvatar player={player} compact />
                  <span className="mc-bench-number">{player.number ?? ""}</span>
                  <span className="mc-bench-name">{player.name}</span>
                  {player.position ? <span className="mc-bench-pos">{player.position}</span> : null}
                  {player.rating != null && player.rating !== "" ? <span className="mc-bench-rating">{player.rating}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function FootballLineups({ home, away, event, t, confirmed = false, onPlayerSelect }) {
  const homeRows = formationRows(home);
  const awayRows = formationRows(away).slice().reverse();
  const homeName = participantName(event.home);
  const awayName = participantName(event.away);
  const homeRating = teamAverageRating(home);
  const awayRating = teamAverageRating(away);
  return (
    <>
      <div className="mc-lineup-summary">
        <div>
          <strong>{homeName}</strong>
          {home.formation || homeRating ? <span>{[home.formation, homeRating ? `Rating ${homeRating}` : ""].filter(Boolean).join(" · ")}</span> : null}
        </div>
        {confirmed ? <span className="mc-lineup-status">Confirmed XI</span> : <span />}
        <div>
          <strong>{awayName}</strong>
          {away.formation || awayRating ? <span>{[away.formation, awayRating ? `Rating ${awayRating}` : ""].filter(Boolean).join(" · ")}</span> : null}
        </div>
      </div>
      <div className="mc-pitch" aria-label={t("match.lineups")}>
        <div className="mc-pitch-mark mc-pitch-center-line" />
        <div className="mc-pitch-mark mc-pitch-center-circle" />
        <div className="mc-pitch-box is-top" />
        <div className="mc-pitch-box is-bottom" />
        <div className="mc-pitch-team is-home">
          {homeRows.map((row, rowIndex) => (
            <div className="mc-pitch-row" key={`home-${rowIndex}`}>
              {row.map((player, index) => <PitchPlayer player={player} onSelect={onPlayerSelect} key={player.id || player.name || index} />)}
            </div>
          ))}
        </div>
        <div className="mc-pitch-team is-away">
          {awayRows.map((row, rowIndex) => (
            <div className="mc-pitch-row" key={`away-${rowIndex}`}>
              {row.map((player, index) => <PitchPlayer player={player} onSelect={onPlayerSelect} key={player.id || player.name || index} />)}
            </div>
          ))}
        </div>
      </div>
      <div className="mc-starting-lists">
        <StartingList side={home} label={homeName} onSelect={onPlayerSelect} />
        <StartingList side={away} label={awayName} onSelect={onPlayerSelect} />
      </div>
      <div className="mc-lineup-benches">
        <BenchList side={home} label={homeName} t={t} onSelect={onPlayerSelect} />
        <BenchList side={away} label={awayName} t={t} onSelect={onPlayerSelect} />
      </div>
    </>
  );
}


function RosterLineups({ home, away, event, t, onPlayerSelect }) {
  return (
    <div className="mc-rosters">
      {[
        [participantName(event.home), home],
        [participantName(event.away), away],
      ].map(([label, side]) => (
        <div className="mc-squad-block" key={label}>
          <div className="mc-squad-title">
            <strong>{label}</strong>
            {side.formation ? <span>{side.formation}</span> : null}
          </div>
          {side.coach ? <p className="mc-coach">{t("match.coach")}: {side.coach}</p> : null}
          <ul className="mc-roster-list">
            {(side.start || []).map((player, index) => (
              <li key={player.id || player.name || index}>
                <button type="button" className="mc-roster-player-button" onClick={() => onPlayerSelect?.(player)}>
                  <PlayerAvatar player={player} compact />
                  <span className="mc-bench-number">{player.number ?? ""}</span>
                  <span className="mc-bench-name">{player.name}</span>
                  {player.position ? <span className="mc-bench-pos">{player.position}</span> : null}
                  {player.rating != null && player.rating !== "" ? <span className="mc-bench-rating">{player.rating}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          {(side.bench || []).length ? <BenchList side={{ ...side, coach: null }} label={t("match.bench")} t={t} onSelect={onPlayerSelect} /> : null}
        </div>
      ))}
    </div>
  );
}

function Lineups({ shape, event, t, onPlayerSelect }) {
  if (!shape) return null;
  if (Array.isArray(shape)) {
    return (
      <section className="mc-card mc-lineup-card">
        <h2>{t("match.lineups")}</h2>
        <ul className="mc-roster-list">
          {shape.map((row, index) => (
            <li key={row.id || row.name || index}>
              <button type="button" className="mc-roster-player-button" onClick={() => onPlayerSelect?.(row)}>
                <PlayerAvatar player={row} compact />
                <span className="mc-bench-name">{row.name || row.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  const home = shape.home || {};
  const away = shape.away || {};
  return (
    <section className="mc-card mc-lineup-card">
      <h2>{t("match.lineups")}</h2>
      {event.sport === "football" && (home.start || []).length >= 7 && (away.start || []).length >= 7 ? (
        <FootballLineups home={home} away={away} event={event} t={t} confirmed={Boolean(shape.confirmed)} onPlayerSelect={onPlayerSelect} />
      ) : (
        <RosterLineups home={home} away={away} event={event} t={t} onPlayerSelect={onPlayerSelect} />
      )}
    </section>
  );
}

export default function MatchCentre({ event, data, standings, articles = [], detailPending = false }) {
  const { t, dateLocale } = useI18n();
  const { favorites, syncFavorites } = useAuth();
  const navigate = useNavigate();
  const kind = rendererForEvent(event);
  const incidents = timelineItems(event, data);
  const statistics = statisticsRows(event, data);
  const lineups = lineupsShape(event, data);
  const h2h = Array.isArray(data?.h2h) ? data.h2h : [];
  const form = data?.form || event.form;
  const formUseful = Boolean(form?.home?.summary || form?.away?.summary);
  const hits = event.score?.hits;
  const errors = event.score?.errors;
  const rubbers = meetingRubbers(event);
  const innings = cricketInnings(event);
  const scorecard = scorecardTables(event);
  const afl = event.sport === "australian-rules" && event.sport_detail?.goals;
  const rugby = rugbyScoring(event);
  const games = seriesGames(event);
  const sets = rubbers.length || innings.length || afl ? null : setTable(event);
  const classification = Array.isArray(event.classification || event.leaderboard || event.runners || event.athletes)
    ? event.classification || event.leaderboard || event.runners || event.athletes
    : [];
  const classColumns = classificationColumns(classification);
  const shownStatistics =
    event.sport === "australian-rules"
      ? statistics.filter((row) => !["goals", "behinds", "score"].includes(String(row.label || "").toLowerCase()))
      : statistics;
  const statisticsPeriods =
    (event.sport_detail && typeof event.sport_detail.statistics_periods === "object"
      ? event.sport_detail.statistics_periods
      : null) ||
    (data?.statistics_periods && typeof data.statistics_periods === "object" ? data.statistics_periods : {}) ||
    {};
  const pair = kind === "TEAM_MATCH" || kind === "HEAD_TO_HEAD" || kind === "BRACKET";
  const related = Array.isArray(data?.related) ? data.related : [];
  const news = Array.isArray(articles) ? articles.filter((row) => row?.slug && row?.title) : [];

  const playerStats = Array.isArray(event.player_statistics) ? event.player_statistics.filter((row) => row && row.name) : [];
  const shots = Array.isArray(event.sport_detail?.shots) ? event.sport_detail.shots : [];
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(() => matchSectionFromHash(location.hash));

  useEffect(() => {
    setActiveSection(matchSectionFromHash(location.hash));
  }, [event.id, location.hash]);

  const openPlayerProfile = (player) => {
    const entity = player?.entity || player;
    const name = player?.name || player?.display_name || participantName(entity);
    navigate(playerProfilePath(entity, event, name || ""));
  };

  const openParticipantProfile = (selected) => {
    const side = selected?.entity || selected;
    const name = selected?.name || participantName(side);
    const registry = getRegistrySport(event.sport);
    const individual =
      event.event_family === "individual_match" ||
      event.event_family === "combat" ||
      ["person", "fighter"].includes(String(registry?.participant_type || "").toLowerCase());
    if (individual) {
      openPlayerProfile({ ...side, name });
      return;
    }
    navigate(teamProfilePath(side, event, name));
  };

  const sections = useMemo(() => {
    const list = [{ id: "overview", label: t("match.overview") }];
    if (shownStatistics.length) list.push({ id: "stats", label: t("predictions.statistics") });
    if (lineups) list.push({ id: "lineups", label: t("match.lineups") });
    if (playerStats.length) list.push({ id: "players", label: t("match.players") });
    if (scorecard.length) list.push({ id: "scorecard", label: "Scorecard" });
    if (shots.length) list.push({ id: "shots", label: "Shots" });
    if (formUseful || h2h.length) list.push({ id: "h2h", label: t("predictions.h2h") });
    if (classification.length) {
      const clsLabel =
        kind === "RACE" || kind === "MEET"
          ? t("match.runners")
          : event.sport === "golf"
            ? "Leaderboard"
            : t("match.classification");
      list.push({ id: "classification", label: clsLabel });
    }
    if (standings.length) list.push({ id: "standings", label: t("match.standings") });
    if (news.length) list.push({ id: "news", label: t("section.topStories") });
    return list;
  }, [classification.length, event.sport, formUseful, h2h.length, kind, lineups, news.length, playerStats.length, scorecard.length, shots.length, shownStatistics.length, standings.length, t]);

  const currentSection = sections.some((item) => item.id === activeSection) ? activeSection : "overview";

  const followedTeams = favorites?.teams || [];
  const homeKey = String(event.home?.id || event.home?.slug || "");
  const awayKey = String(event.away?.id || event.away?.slug || "");
  const leagueKey = scopedCompetitionId(event.sport, event.competition_key || event.competition);
  const favOn = followedTeams.includes(homeKey) || followedTeams.includes(awayKey) || (favorites?.leagues || []).includes(leagueKey);

  function toggleFav(ev) {
    ev.preventDefault();
    const teams = new Set(followedTeams);
    if (homeKey) {
      if (teams.has(homeKey)) teams.delete(homeKey);
      else teams.add(homeKey);
    }
    syncFavorites({ ...favorites, teams: [...teams] });
  }

  const favoriteControl = (
    <div className="mc-fav">
      <FavoriteButton pressed={favOn} label={t("live.followEvent")} onClick={toggleFav} />
    </div>
  );

  return (
    <div className="match-centre">
      <p className="kicker">
        <Link to="/live-scores">{t("liveScores")}</Link>
      </p>
      {pair ? (
        <PairScoreboard event={event} t={t} locale={dateLocale} favorite={favoriteControl} onParticipantSelect={openParticipantProfile} />
      ) : (
        <MetaScoreboard event={event} t={t} locale={dateLocale} favorite={favoriteControl} />
      )}
      {detailPending ? <p className="mc-when">{t("match.loadingDetails")}</p> : null}
      {sections.length > 1 ? (
        <MatchSectionTabs sections={sections} currentSection={currentSection} onSelect={setActiveSection} label={t("match.center")} />
      ) : null}
      <div className="mc-body">
        <div
          className="mc-panel"
          id="mc-panel-overview"
          role="tabpanel"
          aria-labelledby={sections.length > 1 ? "mc-tab-overview" : undefined}
          hidden={currentSection !== "overview"}
        >
          <Rubbers rubbers={rubbers} />
          {afl ? <AflScore event={event} /> : null}
          <Innings rows={innings} detail={event.sport_detail} />
          {rugby.length ? <RugbyScore rows={rugby} home={participantName(event.home)} away={participantName(event.away)} /> : null}
          <Games games={games} event={event} />
          {sets ? (
            <section className="mc-card">
              <h2>
                {event.sport === "tennis" || event.sport === "volleyball" || event.sport === "table-tennis" || event.sport === "badminton"
                  ? t("match.sets")
                  : event.sport === "basketball"
                    ? "Quarters"
                    : event.sport === "baseball" || event.sport === "cricket"
                      ? t("match.innings")
                      : t("match.periods")}
              </h2>
              <div className="mc-scroll">
                <table className="mc-sets">
                  <thead>
                    <tr>
                      <th>{t("match.center")}</th>
                      {sets.map((row, index) => (
                        <th key={index}>{row.label}</th>
                      ))}
                      <th>Tot</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>{participantName(event.home)}</th>
                      {sets.map((row, index) => (
                        <td key={`h-${index}`}>{row.home ?? "–"}</td>
                      ))}
                      <td>{event.score?.home ?? "–"}</td>
                    </tr>
                    <tr>
                      <th>{participantName(event.away)}</th>
                      {sets.map((row, index) => (
                        <td key={`a-${index}`}>{row.away ?? "–"}</td>
                      ))}
                      <td>{event.score?.away ?? "–"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {incidents.length ? <Timeline items={incidents} t={t} /> : null}
          {hits || errors ? (
            <section className="mc-card">
              <h2>{t("match.box")}</h2>
              <p>
                {usefulNumber(hits?.home) || usefulNumber(hits?.away)
                  ? `${t("match.hits")}: ${hits?.home ?? "–"} – ${hits?.away ?? "–"}`
                  : ""}
                {errors && (usefulNumber(errors.home) || usefulNumber(errors.away))
                  ? ` · ${t("match.errors")}: ${errors?.home ?? "–"} – ${errors?.away ?? "–"}`
                  : ""}
              </p>
            </section>
          ) : null}
          <InfoRows event={event} t={t} />
          {related.length ? (
            <section className="mc-card">
              <h2>{t("live.upcoming")}</h2>
              <ul>
                {related.slice(0, 6).map((row) => {
                  const label = row.label || `${participantName(row.home)} vs ${participantName(row.away)}`;
                  return (
                    <li key={row.id || row.label}>
                      {row.id ? <Link to={eventPath(row.id)} state={{ event: row }}>{label}</Link> : label}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        {shownStatistics.length ? (
          <div
            className="mc-panel"
            id="mc-panel-stats"
            role="tabpanel"
            aria-labelledby="mc-tab-stats"
            hidden={currentSection !== "stats"}
          >
            <StatCompare rows={shownStatistics} t={t} sport={event.sport} periods={statisticsPeriods} eventId={event.id} />
          </div>
        ) : null}

        {lineups ? (
          <div
            className="mc-panel"
            id="mc-panel-lineups"
            role="tabpanel"
            aria-labelledby="mc-tab-lineups"
            hidden={currentSection !== "lineups"}
          >
            <Lineups shape={lineups} event={event} t={t} onPlayerSelect={openPlayerProfile} />
          </div>
        ) : null}

        {playerStats.length ? (
          <div
            className="mc-panel"
            id="mc-panel-players"
            role="tabpanel"
            aria-labelledby="mc-tab-players"
            hidden={currentSection !== "players"}
          >
            <PlayerTable rows={playerStats} event={event} onPlayerClick={openPlayerProfile} />
          </div>
        ) : null}

        {scorecard.length ? (
          <div
            className="mc-panel"
            id="mc-panel-scorecard"
            role="tabpanel"
            aria-labelledby="mc-tab-scorecard"
            hidden={currentSection !== "scorecard"}
          >
            <Scorecard blocks={scorecard} />
          </div>
        ) : null}

        {shots.length ? (
          <div
            className="mc-panel"
            id="mc-panel-shots"
            role="tabpanel"
            aria-labelledby="mc-tab-shots"
            hidden={currentSection !== "shots"}
          >
            <ShotList shots={shots} />
          </div>
        ) : null}

        {formUseful || h2h.length ? (
          <div
            className="mc-panel"
            id="mc-panel-h2h"
            role="tabpanel"
            aria-labelledby="mc-tab-h2h"
            hidden={currentSection !== "h2h"}
          >
            {formUseful ? (
              <section className="mc-card">
                <h2>{t("predictions.recentForm")}</h2>
                {form.home?.summary ? <p>{form.home.summary}</p> : null}
                {form.away?.summary ? <p>{form.away.summary}</p> : null}
              </section>
            ) : null}
            {h2h.length ? (
              <section className="mc-card">
                <h2>{t("predictions.h2h")}</h2>
                <ul className="mc-h2h-list">
                  {h2h.map((row, index) => {
                    const label = row.label || row.summary || `${participantName(row.home)} vs ${participantName(row.away)}`;
                    return (
                      <li key={row.id || index}>
                        {row.id ? <Link to={eventPath(row.id)} state={{ event: row }}>{label}</Link> : label}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {classification.length ? (
          <div
            className="mc-panel"
            id="mc-panel-classification"
            role="tabpanel"
            aria-labelledby="mc-tab-classification"
            hidden={currentSection !== "classification"}
          >
            <section className="mc-card">
              <h2>{event.sport === "golf" ? "Leaderboard" : t("match.classification")}</h2>
              {classColumns.length ? <ClassificationTable rows={classification} /> : null}
              {classColumns.length ? null : (
                <ol className="mc-leader">
                  {classification.map((row, index) => {
                    const name =
                      typeof row === "string"
                        ? row
                        : [
                            row.position,
                            row.trap != null ? `T${row.trap}` : "",
                            row.name || row.player || row.driver || row.label,
                            row.total != null ? row.total : "",
                            row.gap || row.interval || "",
                            row.status || "",
                          ]
                            .filter((part) => part !== "" && part != null)
                            .join(" ");
                    return <li key={row.id || name || index}>{name || String(row.value ?? "")}</li>;
                  })}
                </ol>
              )}
            </section>
          </div>
        ) : null}

        {standings.length ? (
          <div
            className="mc-panel"
            id="mc-panel-standings"
            role="tabpanel"
            aria-labelledby="mc-tab-standings"
            hidden={currentSection !== "standings"}
          >
            <section className="mc-card">
              <h2>{t("match.standings")}</h2>
              <StandingsTable
                sport={event.sport}
                rows={standings}
                event={event}
                competition={event.competition_key || event.competition}
                competitionCountry={event.country_id}
              />
            </section>
          </div>
        ) : null}

        {news.length ? (
          <div
            className="mc-panel"
            id="mc-panel-news"
            role="tabpanel"
            aria-labelledby="mc-tab-news"
            hidden={currentSection !== "news"}
          >
            <section className="mc-card">
              <h2>{t("section.topStories")}</h2>
              <ul>
                {news.slice(0, 8).map((row) => (
                  <li key={row.slug}>
                    <Link to={`/article/${row.slug}`}>{row.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
