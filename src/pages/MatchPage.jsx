import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMatch, getStandings } from "../api.js";
import { setPageSeo, breadcrumbJsonLd } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import {
  eventPath,
  formatEventDateTime,
  isFinishedStatus,
  normalizeEvent,
  participantLogo,
  participantName,
  publicEventSafe,
  scoreLine,
} from "../lib/sportsData.js";
import { competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import ProviderPending from "../components/ProviderPending.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StandingsTable from "../components/StandingsTable.jsx";

function Section({ title, show, children }) {
  if (!show) return null;
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

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

function Side({ side }) {
  const name = participantName(side);
  const logo = participantLogo(side);
  return (
    <span className="score-side">
      {logo ? <img className="score-logo" src={logo} alt="" width="28" height="28" /> : null}
      <strong className="score-name">{name || "—"}</strong>
    </span>
  );
}

export default function MatchPage() {
  const { t, dateLocale } = useI18n();
  const { matchId } = useParams();
  const [data, setData] = useState(null);
  const [standings, setStandings] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMatch(matchId)
      .then((payload) => {
        if (!cancelled) {
          setData(publicEventSafe(payload));
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setData({ connected: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const event = normalizeEvent(data?.event || data?.header);
  const home = participantName(event?.home);
  const away = participantName(event?.away);
  const title =
    home && away ? `${home} vs ${away}` : event?.tournament || t("match.center");
  const path = eventPath(matchId);

  useEffect(() => {
    setPageSeo({
      title: `${title} | NinkoSports`,
      description: event
        ? `${competitionLabel(event.competition)} · ${t("seo.liveDescription")}`
        : t("match.readyBody"),
      path,
      jsonLd: breadcrumbJsonLd([
        { name: t("nav.home"), path: "/" },
        { name: t("liveScores"), path: "/live-scores" },
        { name: title, path },
      ]),
      noindex: !event,
    });
  }, [event, path, t, title]);

  useEffect(() => {
    if (!event?.competition_key) return undefined;
    let cancelled = false;
    getStandings(event.competition_key)
      .then((payload) => {
        if (!cancelled && payload?.connected && Array.isArray(payload.rows)) {
          setStandings(payload.rows);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [event?.competition_key]);

  const score = scoreLine(event);
  const lineups = asList(data?.lineups);
  const incidents = asList(data?.incidents);
  const statistics = asList(data?.statistics);
  const availability = Array.isArray(data?.availability) ? data.availability : [];
  const h2h = Array.isArray(data?.h2h) ? data.h2h : [];
  const form = data?.form;
  const classification = event?.classification || event?.leaderboard || event?.runners;
  const type = event?.event_type || "TEAM_MATCH";

  if (error) {
    return (
      <div className="page-match">
        <EmptyState
          title={t("live.unavailableTitle")}
          body={t("live.unavailableBody")}
        />
      </div>
    );
  }

  return (
    <div className="page-match">
      <p className="kicker">
        <Link to="/live-scores">{t("liveScores")}</Link>
        {event?.sport ? ` · ${t(sportI18nKey(event.sport) || "sport.label")}` : ""}
      </p>
      <h1>{title}</h1>
      {event?.competition ? (
        <p className="lede">{competitionLabel(event.competition)}</p>
      ) : (
        <p className="lede">{t("match.readyBody")}</p>
      )}
      {event ? (
        <div className="match-grid">
          <section className="panel score-hero">
            <h2>{competitionLabel(event.competition)}</h2>
            {type === "TEAM_MATCH" || type === "HEAD_TO_HEAD" ? (
              <div className="score-hero-pair">
                <Side side={event.home} />
                <span className="score-hero-score">
                  {score || (event.live ? t("live.now") : t("predictions.vs"))}
                </span>
                <Side side={event.away} />
              </div>
            ) : (
              <p>{score || event.status}</p>
            )}
            <p className="score-hero-meta">
              {event.live ? t("live.now") : isFinishedStatus(event.status) ? t("live.finished") : event.status}
              {formatEventDateTime(event, dateLocale) ? ` · ${formatEventDateTime(event, dateLocale)}` : ""}
              {event.round ? ` · ${event.round}` : ""}
            </p>
          </section>
          <Section title={t("match.details")} show={Boolean(event.venue || event.stage || event.session_type)}>
            {event.venue ? (
              <p>
                {t("match.venue")}: {event.venue}
              </p>
            ) : null}
            {event.session_type ? <p>{event.session_type}</p> : null}
            {event.stage && event.stage !== event.round ? <p>{event.stage}</p> : null}
          </Section>
          <Section title={t("predictions.recentForm")} show={Boolean(form)}>
            {form?.home?.summary ? <p>{form.home.summary}</p> : null}
            {form?.away?.summary ? <p>{form.away.summary}</p> : null}
          </Section>
          <Section title={t("predictions.statistics")} show={statistics.length > 0}>
            <ul>
              {statistics.map((row, index) => (
                <li key={row.label || index}>
                  {row.label || row.name}: {String(row.value ?? row.summary ?? "")}
                </li>
              ))}
            </ul>
          </Section>
          <Section title={t("match.lineups")} show={lineups.length > 0}>
            <ul>
              {lineups.map((row, index) => (
                <li key={row.id || row.name || index}>{row.name || row.label}</li>
              ))}
            </ul>
          </Section>
          <Section title={t("match.incidents")} show={incidents.length > 0}>
            <ul>
              {incidents.map((row, index) => (
                <li key={row.id || index}>{row.label || row.name || row.summary}</li>
              ))}
            </ul>
          </Section>
          <Section title={t("predictions.h2h")} show={h2h.length > 0}>
            <ul>
              {h2h.map((row, index) => (
                <li key={row.id || index}>{row.label || row.summary}</li>
              ))}
            </ul>
          </Section>
          <Section title={t("predictions.availability")} show={availability.length > 0}>
            <ul>
              {availability.map((row, index) => (
                <li key={row.id || index}>{row.name || row.label}</li>
              ))}
            </ul>
          </Section>
          <Section
            title={t("match.classification")}
            show={Array.isArray(classification) && classification.length > 0}
          >
            <ol>
              {classification.slice(0, 20).map((row, index) => (
                <li key={row.id || row.name || index}>
                  {typeof row === "string" ? row : row.name || row.driver || row.team}
                </li>
              ))}
            </ol>
          </Section>
          <Section title={t("match.standings")} show={standings.length > 0}>
            <StandingsTable sport={event.sport} rows={standings} />
          </Section>
        </div>
      ) : (
        <ProviderPending title={t("match.readyTitle")} body={t("match.readyBody")} />
      )}
    </div>
  );
}
