import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getTeamProfile } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import {
  eventPath,
  formatEventDateTime,
  normalizeEvent,
  participantLogo,
  participantName,
  publicEventSafe,
  scoreLine,
} from "../lib/sportsData.js";

function TeamMark({ team, name }) {
  const logo = participantLogo(team);
  if (logo) return <img className="entity-profile-logo" src={logo} alt="" loading="eager" referrerPolicy="no-referrer" />;
  const initials = String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className="entity-profile-logo is-fallback">{initials || "?"}</span>;
}

function MatchList({ title, rows }) {
  const events = useMemo(
    () => (Array.isArray(rows) ? rows.map((row) => normalizeEvent(publicEventSafe(row))).filter(Boolean) : []),
    [rows]
  );
  if (!events.length) return null;
  return (
    <section className="entity-card">
      <div className="entity-card-head"><h2>{title}</h2></div>
      <div className="entity-match-list">
        {events.map((event) => (
          <Link className="entity-match-row" to={eventPath(event.id)} key={event.id}>
            <span className="entity-match-meta">
              <small>{event.competition_name || event.competition}</small>
              <time>{formatEventDateTime(event)}</time>
            </span>
            <span className="entity-match-pair">
              <span>{participantName(event.home) || "—"}</span>
              <strong>{scoreLine(event) || "vs"}</strong>
              <span>{participantName(event.away) || "—"}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StandingCard({ row }) {
  if (!row || typeof row !== "object") return null;
  const ignored = new Set(["team", "logo", "crest", "image", "badge", "provider", "source", "source_id"]);
  const entries = Object.entries(row)
    .filter(([key, value]) => !ignored.has(key) && value !== null && value !== undefined && value !== "" && typeof value !== "object")
    .slice(0, 10);
  if (!entries.length) return null;
  return (
    <section className="entity-card">
      <div className="entity-card-head"><h2>Standings</h2></div>
      <dl className="entity-facts">
        {entries.map(([key, value]) => (
          <div key={key}><dt>{key.replace(/_/g, " ")}</dt><dd>{String(value)}</dd></div>
        ))}
      </dl>
    </section>
  );
}

export default function TeamPage() {
  const { entityKey = "" } = useParams();
  const [search] = useSearchParams();
  const sport = search.get("sport") || "";
  const competition = search.get("competition") || "";
  const requestedName = search.get("name") || "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getTeamProfile(entityKey, { sport, competition, name: requestedName })
      .then((payload) => { if (!cancelled) setData(payload); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entityKey, sport, competition, requestedName]);

  const team = data?.team || {};
  const name = data?.name || participantName(team) || requestedName || entityKey;

  useEffect(() => {
    setPageSeo({
      title: name ? `${name} | NinkoSports` : "Team | NinkoSports",
      description: name ? `${name} fixtures, results and team information on NinkoSports.` : "Team profile on NinkoSports.",
      path: window.location.pathname + window.location.search,
      noindex: !data?.available,
    });
  }, [name, data?.available]);

  if (loading) return <div className="entity-page"><div className="entity-card entity-loading">Loading team…</div></div>;
  if (error || !data?.available) {
    return <div className="entity-page"><Link className="entity-back" to="/live-scores">← Live Scores</Link><section className="entity-card"><h1>{name || "Team"}</h1><p>Team data is not available yet.</p></section></div>;
  }

  const country = team.country_id || team.country || team.nationality || "";
  const form = Array.isArray(data.form) ? data.form.filter(Boolean) : [];

  return (
    <div className="entity-page">
      <Link className="entity-back" to="/live-scores">← Live Scores</Link>
      <header className="entity-hero">
        <TeamMark team={team} name={name} />
        <div>
          <p className="kicker">Team</p>
          <h1>{name}</h1>
          <div className="entity-subline">
            {country ? <span>{country}</span> : null}
            {data.sport ? <span>{data.sport.replace(/-/g, " ")}</span> : null}
          </div>
          {form.length ? <div className="entity-form" aria-label="Recent form">{form.map((result, index) => <span className={`is-${String(result).toLowerCase()}`} key={`${result}-${index}`}>{result}</span>)}</div> : null}
        </div>
      </header>
      <div className="entity-grid">
        <div>
          <MatchList title="Upcoming matches" rows={data.fixtures} />
          <MatchList title="Recent results" rows={data.results} />
        </div>
        <aside><StandingCard row={data.standings_position} /></aside>
      </div>
    </div>
  );
}
