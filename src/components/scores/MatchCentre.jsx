import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StandingsTable from "../StandingsTable.jsx";
import Crest from "./Crest.jsx";
import { useI18n } from "../../context/I18nContext.jsx";
import { competitionLabel } from "../../labels.js";
import { sportI18nKey } from "../../i18n/index.js";
import {
  formatEventDateTime,
  formatEventTime,
  isConfirmedLive,
  isFinishedStatus,
  participantName,
} from "../../lib/sportsData.js";
import {
  eventTitle,
  namedField,
  rendererForEvent,
  sportScoreText,
  statusLabel,
} from "../../lib/scorePresentation.js";
import { flagEmoji, sideCountry } from "../../lib/identityAssets.js";

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    if (Array.isArray(value.home) || Array.isArray(value.away)) {
      return [
        ...(value.home || []).map((row) => ({ ...row, side: "home" })),
        ...(value.away || []).map((row) => ({ ...row, side: "away" })),
      ];
    }
    return Object.entries(value)
      .filter(([key]) => !String(key).startsWith("source") && key !== "provider")
      .map(([key, item]) => ({ label: key, value: item }));
  }
  return [];
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

function ParticipantBlock({ side, event, align }) {
  const name = participantName(side) || "—";
  const flag = flagEmoji(sideCountry(side, event.country_id));
  return (
    <div className={`mc-player is-${align}`}>
      <Crest side={side} size={56} />
      <strong>
        {flag ? <span className="score-flag">{flag}</span> : null}
        {name}
      </strong>
    </div>
  );
}

function PairScoreboard({ event, t, locale }) {
  const live = isConfirmedLive(event);
  const finished = isFinishedStatus(event.status);
  const time = formatEventTime(event, locale);
  const score = live || finished ? sportScoreText(event) : t("predictions.vs");
  const stamp = formatEventDateTime(event, locale);
  return (
    <div className={`mc-hero ${live ? "is-live" : ""}`}>
      <p className="mc-kicker">
        {competitionLabel(event.competition)}
        {event.round ? ` · ${event.round}` : ""}
      </p>
      <div className="mc-board">
        <ParticipantBlock side={event.home} event={event} align="home" />
        <div className="mc-score">
          <div className="mc-score-value">{score}</div>
          <div className={`mc-score-status ${live ? "is-live" : ""}`}>
            {live ? t("live.live") : finished ? statusLabel(event, t, time) : time || t("live.scheduled")}
          </div>
        </div>
        <ParticipantBlock side={event.away} event={event} align="away" />
      </div>
      {stamp ? <p className="mc-when">{stamp}</p> : null}
    </div>
  );
}

function MetaScoreboard({ event, t, locale }) {
  const live = isConfirmedLive(event);
  const stamp = formatEventDateTime(event, locale);
  const names = namedField(
    event.classification || event.leaderboard || event.runners || event.athletes,
    8
  );
  return (
    <div className={`mc-hero is-meta ${live ? "is-live" : ""}`}>
      <p className="mc-kicker">{competitionLabel(event.competition)}</p>
      <h2 className="mc-event-title">{eventTitle(event)}</h2>
      <div className={`mc-score-status ${live ? "is-live" : ""}`}>{statusLabel(event, t, formatEventTime(event, locale))}</div>
      {stamp ? <p className="mc-when">{stamp}</p> : null}
      {event.session_type || event.stage || event.race_number ? (
        <p className="mc-when">
          {[event.session_type, event.stage, event.race_number ? `${t("live.round")} ${event.race_number}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      {event.winner ? <p className="mc-when">{t("match.winner")}: {event.winner}</p> : null}
      {names.length ? (
        <ol className="mc-leader">
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function InfoGrid({ event, t, locale }) {
  const rows = [
    event.competition ? [t("match.competition"), competitionLabel(event.competition)] : null,
    event.round ? [t("live.round"), event.round] : null,
    event.season ? [t("match.season"), event.season] : null,
    event.series_id ? [t("match.series"), event.series_id] : null,
    event.session_type ? [t("match.session"), event.session_type] : null,
    event.venue ? [t("match.venue"), event.venue] : null,
    event.attendance != null && event.attendance !== "" ? [t("match.attendance"), event.attendance] : null,
    event.referee ? [t("match.referee"), event.referee] : null,
    event.best_of ? [t("match.series"), `BO${event.best_of}`] : null,
    event.winner ? [t("match.winner"), event.winner] : null,
    event.game_id ? [t("match.game"), event.game_id] : null,
    event.start_time ? [t("match.kickoff"), formatEventDateTime(event, locale)] : null,
    event.status ? [t("match.status"), statusLabel(event, t, formatEventTime(event, locale))] : null,
    event.attendance != null ? [t("match.attendance"), event.attendance] : null,
    event.referee ? [t("match.referee"), event.referee] : null,
    event.best_of ? [t("match.series"), `BO${event.best_of}`] : null,
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

export default function MatchCentre({ event, data, standings, detailPending = false }) {
  const { t, dateLocale } = useI18n();
  const kind = rendererForEvent(event);
  const lineups = asList(data?.lineups || event.lineups);
  const incidents = asList(data?.incidents || event.incidents);
  const statistics = asList(data?.statistics || event.statistics);
  const h2h = Array.isArray(data?.h2h) ? data.h2h : [];
  const form = data?.form || event.form;
  const formUseful = Boolean(form?.home?.summary || form?.away?.summary);
  const hits = event.score?.hits;
  const errors = event.score?.errors;
  const sets = setTable(event);
  const classification = asList(event.classification || event.leaderboard || event.runners || event.athletes);
  const maps = asList(event.maps);
  const tabs = useMemo(() => {
    const rows = [{ id: "overview", label: t("match.overview") }];
    if (statistics.length) rows.push({ id: "stats", label: t("predictions.statistics") });
    if (lineups.length) rows.push({ id: "lineups", label: t("match.lineups") });
    if (incidents.length) rows.push({ id: "timeline", label: t("match.incidents") });
    if (h2h.length) rows.push({ id: "h2h", label: t("predictions.h2h") });
    if (standings.length) rows.push({ id: "standings", label: t("match.standings") });
    if (classification.length && (kind === "RACE" || kind === "MEET" || kind === "TOURNAMENT" || kind === "MULTI_EVENT_MEET")) {
      rows.push({ id: "classification", label: t("match.classification") });
    }
    if (maps.length) rows.push({ id: "maps", label: t("match.maps") });
    return rows;
  }, [classification.length, h2h.length, incidents.length, kind, lineups.length, maps.length, standings.length, statistics.length, t]);
  const [tab, setTab] = useState("overview");
  const active = tabs.some((item) => item.id === tab) ? tab : "overview";
  const pair = kind === "TEAM_MATCH" || kind === "HEAD_TO_HEAD" || kind === "BRACKET";

  return (
    <div className="match-centre">
      <p className="kicker">
        <Link to="/live-scores">{t("liveScores")}</Link>
        {event.sport ? ` · ${t(sportI18nKey(event.sport) || "sport.label")}` : ""}
      </p>
      {pair ? (
        <PairScoreboard event={event} t={t} locale={dateLocale} />
      ) : (
        <MetaScoreboard event={event} t={t} locale={dateLocale} />
      )}
      {detailPending ? <p className="mc-when">{t("match.loadingDetails")}</p> : null}
      {sets ? (
        <section className="mc-card">
          <h2>
            {event.sport === "tennis" || event.sport === "volleyball" || event.sport === "table-tennis"
              ? t("match.sets")
              : event.sport === "baseball"
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
                <th>{t("live.finished") === "Finished" ? "Tot" : "Tot"}</th>
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
      {tabs.length > 1 ? (
        <div className="mc-tabs" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === active}
              className={item.id === active ? "tab is-active" : "tab"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {active === "overview" ? (
        <div className="mc-overview">
          <InfoGrid event={event} t={t} locale={dateLocale} />
          {incidents.length ? (
            <section className="mc-card">
              <h2>{t("match.incidents")}</h2>
              <ul>
                {incidents.map((row, index) => (
                  <li key={row.id || index}>
                    {[
                      row.minute != null ? `${row.minute}’` : "",
                      row.player || row.name || row.label,
                      row.type && row.type !== "goal" ? String(row.type).replace(/_/g, " ") : "",
                      row.score_after
                        ? `${row.score_after.home ?? ""}–${row.score_after.away ?? ""}`
                        : row.summary,
                    ]
                      .filter(Boolean)
                      .join(" · ") || String(row.score?.home ?? "")}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {formUseful ? (
            <section className="mc-card">
              <h2>{t("predictions.recentForm")}</h2>
              {form.home?.summary ? <p>{form.home.summary}</p> : null}
              {form.away?.summary ? <p>{form.away.summary}</p> : null}
            </section>
          ) : null}
          {hits || errors ? (
            <section className="mc-card">
              <h2>{t("match.box")}</h2>
              <p>
                {t("match.hits")}: {hits?.home ?? "–"} – {hits?.away ?? "–"}
                {errors ? ` · ${t("match.errors")}: ${errors?.home ?? "–"} – ${errors?.away ?? "–"}` : ""}
              </p>
            </section>
          ) : null}
        </div>
      ) : null}
      {active === "stats" ? (
        <section className="mc-card">
          <h2>{t("predictions.statistics")}</h2>
          <ul>
            {statistics.map((row, index) => (
              <li key={row.label || index}>
                {row.label || row.name}: {String(row.value ?? row.summary ?? "")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {active === "lineups" ? (
        <section className="mc-card">
          <h2>{t("match.lineups")}</h2>
          <ul>
            {lineups.map((row, index) => (
              <li key={row.id || row.name || index}>{row.name || row.label}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {active === "timeline" ? (
        <section className="mc-card">
          <h2>{t("match.incidents")}</h2>
          <ul>
            {incidents.map((row, index) => (
              <li key={row.id || index}>
                {[
                  row.minute != null ? `${row.minute}’` : "",
                  row.player || row.name || row.label,
                  row.type && row.type !== "goal" ? String(row.type).replace(/_/g, " ") : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {active === "h2h" ? (
        <section className="mc-card">
          <h2>{t("predictions.h2h")}</h2>
          <ul>
            {h2h.map((row, index) => (
              <li key={row.id || index}>{row.label || row.summary}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {active === "standings" ? (
        <section className="mc-card">
          <h2>{t("match.standings")}</h2>
          <StandingsTable sport={event.sport} rows={standings} />
        </section>
      ) : null}
      {active === "classification" ? (
        <section className="mc-card">
          <h2>{t("match.classification")}</h2>
          <ol className="mc-leader">
            {classification.map((row, index) => {
              const name =
                typeof row === "string"
                  ? row
                  : [row.position, row.trap != null ? `T${row.trap}` : "", row.name || row.player || row.driver || row.label]
                      .filter((part) => part !== "" && part != null)
                      .join(" ");
              return <li key={row.id || name || index}>{name || String(row.value ?? "")}</li>;
            })}
          </ol>
        </section>
      ) : null}
      {active === "maps" ? (
        <section className="mc-card">
          <h2>{t("match.maps")}</h2>
          <ul>
            {maps.map((row, index) => (
              <li key={row.id || row.name || index}>
                {row.name || row.map || row.label || String(row.value ?? "")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
