import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import StandingsTable from "../StandingsTable.jsx";
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
  participantName,
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

function competitionHead(event) {
  const presented = competitionPresentation(event);
  const name = presented.displayName || competitionLabel(event.competition);
  return { kicker: presented.kicker, name };
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

function ParticipantBlock({ side, event, align }) {
  const name = participantName(side, { sport: event.sport, competitionCountry: event.country_id }) || "—";
  return (
    <div className={`mc-player is-${align}`}>
      <Crest side={side} size={48} />
      <strong>{name}</strong>
    </div>
  );
}

function PairScoreboard({ event, t, locale, favorite }) {
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
      {presented.kicker ? <p className="mc-geo">{presented.kicker}</p> : null}
      <p className="mc-kicker">
        {presented.name}
        {event.round ? ` · ${event.round}` : ""}
      </p>
      <div className="mc-board">
        <ParticipantBlock side={event.home} event={event} align="home" />
        <div className="mc-score">
          <div className="mc-score-value">{score}</div>
          <div className={`mc-score-status ${live ? "is-live" : ""}`}>{statusLabel(event, t, time)}</div>
          {clock != null && clock !== "" && live ? <div className="mc-score-status is-live">{String(clock).replace(/'$/, "")}’</div> : null}
        </div>
        <ParticipantBlock side={event.away} event={event} align="away" />
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

function Timeline({ items, t }) {
  if (!items.length) return null;
  const first = items.filter((row) => periodBucket(row) === "first");
  const second = items.filter((row) => periodBucket(row) === "second");
  const groups = second.length ? [["first", first, t("match.firstHalf")], ["second", second, t("match.secondHalf")]] : [["all", items, t("match.timeline")]];
  return (
    <section className="mc-card">
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
                  : [row.player, row.assist ? `(${row.assist})` : "", row.type && row.family !== "goal" ? String(row.type).replace(/_/g, " ") : ""]
                      .filter(Boolean)
                      .join(" ");
              return (
                <li key={row.id || `${row.minute}-${index}`}>
                  <span className="mc-minute">{row.minute != null ? `${row.minute}’` : ""}</span>
                  <span>{body}</span>
                  {score ? <span className="mc-tl-score">{score}</span> : null}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}

function StatCompare({ rows, t }) {
  if (!rows.length) return null;
  return (
    <section className="mc-card">
      <h2>{t("predictions.statistics")}</h2>
      <ul className="mc-stats">
        {rows.map((row, index) => {
          const home = row.home;
          const away = row.away;
          const hNum = Number(home);
          const aNum = Number(away);
          const total = (Number.isFinite(hNum) ? hNum : 0) + (Number.isFinite(aNum) ? aNum : 0);
          return (
            <li key={row.label || index}>
              <div className="mc-stat-nums">
                <span>{home ?? "–"}</span>
                <span className="mc-stat-label">{row.label || row.name}</span>
                <span>{away ?? row.value ?? "–"}</span>
              </div>
              {Number.isFinite(hNum) && Number.isFinite(aNum) && total > 0 ? (
                <div className="mc-stat-bar" aria-hidden="true">
                  <span style={{ width: `${(hNum / total) * 100}%` }} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Lineups({ shape, event, t }) {
  if (!shape) return null;
  if (Array.isArray(shape)) {
    return (
      <section className="mc-card">
        <h2>{t("match.lineups")}</h2>
        <ul>
          {shape.map((row, index) => (
            <li key={row.id || row.name || index}>{row.name || row.label}</li>
          ))}
        </ul>
      </section>
    );
  }
  const home = shape.home || {};
  const away = shape.away || {};
  return (
    <section className="mc-card">
      <h2>{t("match.lineups")}</h2>
      <div className="mc-lineups">
        {[
          [participantName(event.home), home],
          [participantName(event.away), away],
        ].map(([label, side]) => (
          <div key={label}>
            <h3>{label}</h3>
            {side.formation ? <p className="mc-when">{side.formation}</p> : null}
            {side.coach ? <p className="mc-when">{t("match.coach")}: {side.coach}</p> : null}
            <ul>
              {(side.start || []).map((row, index) => (
                <li key={row.name || index}>
                  {row.number ? `${row.number} ` : ""}
                  {row.name}
                </li>
              ))}
            </ul>
            {(side.bench || []).length ? (
              <>
                <h4>{t("match.bench")}</h4>
                <ul>
                  {side.bench.map((row, index) => (
                    <li key={row.name || index}>{row.name}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function MatchCentre({ event, data, standings, articles = [], detailPending = false }) {
  const { t, dateLocale } = useI18n();
  const { favorites, syncFavorites } = useAuth();
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
  const pair = kind === "TEAM_MATCH" || kind === "HEAD_TO_HEAD" || kind === "BRACKET";
  const related = Array.isArray(data?.related) ? data.related : [];
  const news = Array.isArray(articles) ? articles.filter((row) => row?.slug && row?.title) : [];

  const playerStats = Array.isArray(event.player_statistics) ? event.player_statistics.filter((row) => row && row.name) : [];
  const shots = Array.isArray(event.sport_detail?.shots) ? event.sport_detail.shots : [];
  const sections = useMemo(() => {
    const list = [{ id: "overview", label: t("match.overview") }];
    if (rubbers.length) list.push({ id: "rubbers", label: "Rubbers" });
    if (afl) list.push({ id: "score", label: "Score" });
    if (innings.length) list.push({ id: "innings", label: t("match.innings") });
    if (scorecard.length) list.push({ id: "scorecard", label: "Scorecard" });
    if (sets) {
      const sport = event.sport;
      const label =
        sport === "tennis" || sport === "volleyball" || sport === "table-tennis" || sport === "badminton"
          ? t("match.sets")
          : sport === "basketball"
            ? "Quarters"
            : sport === "baseball" || sport === "cricket"
              ? t("match.innings")
              : t("match.periods");
      list.push({ id: "periods", label });
    }
    if (games.length) list.push({ id: "maps", label: "Games" });
    if (incidents.length) list.push({ id: "timeline", label: t("match.timeline") });
    if (rugby.length) list.push({ id: "rugby", label: "Scoring" });
    if (shownStatistics.length) list.push({ id: "stats", label: t("predictions.statistics") });
    if (lineups) list.push({ id: "lineups", label: t("match.lineups") });
    if (playerStats.length) list.push({ id: "players", label: t("match.players") });
    if (shots.length) list.push({ id: "shots", label: "Shots" });
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
  }, [afl, classification.length, event.sport, games.length, incidents.length, innings.length, kind, lineups, news.length, playerStats.length, rubbers.length, rugby.length, scorecard.length, sets, shots.length, shownStatistics.length, standings.length, t]);

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
        <PairScoreboard event={event} t={t} locale={dateLocale} favorite={favoriteControl} />
      ) : (
        <MetaScoreboard event={event} t={t} locale={dateLocale} favorite={favoriteControl} />
      )}
      {detailPending ? <p className="mc-when">{t("match.loadingDetails")}</p> : null}
      {sections.length > 1 ? (
        <div className="mc-tabs" role="tablist">
          {sections.map((item) => (
            <a key={item.id} className="mc-tab" href={`#mc-${item.id}`}>
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
      <div className="mc-body">
        <div id="mc-overview">
            <Rubbers rubbers={rubbers} />
            {afl ? <AflScore event={event} /> : null}
            <Innings rows={innings} detail={event.sport_detail} />
            <Scorecard blocks={scorecard} />
            {rugby.length ? <RugbyScore rows={rugby} home={participantName(event.home)} away={participantName(event.away)} /> : null}
            <Games games={games} event={event} />
            {sets ? (
              <section className="mc-card" id="mc-periods">
                <h2>
                  {event.sport === "tennis" || event.sport === "volleyball" || event.sport === "table-tennis" || event.sport === "badminton"
                    ? t("match.sets")
                    : event.sport === "basketball"
                      ? "Quarters"
                      : event.sport === "baseball" || event.sport === "cricket"
                        ? t("match.innings")
                        : t("match.periods")}
                </h2>
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
              </section>
            ) : null}
            {incidents.length ? <div id="mc-timeline"><Timeline items={incidents} t={t} /></div> : null}
            {shownStatistics.length ? <div id="mc-stats"><StatCompare rows={shownStatistics} t={t} /></div> : null}
            {lineups ? <div id="mc-lineups"><Lineups shape={lineups} event={event} t={t} /></div> : null}
            <PlayerTable rows={playerStats} event={event} />
            <ShotList shots={shots} />
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
                <ul>
                  {h2h.map((row, index) => (
                    <li key={row.id || index}>{row.label || row.summary}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {classification.length ? (
              <section className="mc-card" id="mc-classification">
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
            ) : null}
            <InfoRows event={event} t={t} />
            {related.length ? (
              <section className="mc-card">
                <h2>{t("live.upcoming")}</h2>
                <ul>
                  {related.slice(0, 6).map((row) => (
                    <li key={row.id || row.label}>{row.label || `${participantName(row.home)} vs ${participantName(row.away)}`}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {standings.length ? (
              <section className="mc-card" id="mc-standings">
                <h2>{t("match.standings")}</h2>
                <StandingsTable sport={event.sport} rows={standings} />
              </section>
            ) : null}
            {news.length ? (
              <section className="mc-card" id="mc-news">
                <h2>{t("section.topStories")}</h2>
                <ul>
                  {news.slice(0, 8).map((row) => (
                    <li key={row.slug}>
                      <Link to={`/article/${row.slug}`}>{row.title}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
        </div>
      </div>
    </div>
  );
}
