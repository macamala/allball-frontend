import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { getPlayerProfile } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import {
  eventPath,
  formatEventDateTime,
  normalizeEvent,
  participantName,
  publicEventSafe,
  scoreLine,
  teamProfilePath,
} from "../lib/sportsData.js";

function playerImage(player) {
  return player?.image || player?.photo || player?.avatar || player?.portrait || "";
}

function PlayerAvatar({ player, name }) {
  const image = playerImage(player);
  if (image) return <img className="entity-profile-logo is-player" src={image} alt="" loading="eager" referrerPolicy="no-referrer" />;
  const initials = String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className="entity-profile-logo is-player is-fallback">{initials || "?"}</span>;
}

function AppearanceList({ rows }) {
  if (!Array.isArray(rows) || !rows.length) return null;
  return (
    <section className="entity-card">
      <div className="entity-card-head"><h2>Matches</h2></div>
      <div className="entity-match-list">
        {rows.map((raw) => {
          const event = normalizeEvent(publicEventSafe(raw));
          if (!event) return null;
          return (
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
          );
        })}
      </div>
    </section>
  );
}

export default function PlayerPage() {
  const { playerKey = "" } = useParams();
  const location = useLocation();
  const [search] = useSearchParams();
  const requestedName = search.get("name") || "";
  const eventId = search.get("event_id") || "";
  const returnTo = location.state?.matchReturnTo;
  const backPath = typeof returnTo === "string" && returnTo.startsWith("/scores/event/") ? returnTo : eventId ? eventPath(eventId) : "/live-scores";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getPlayerProfile(playerKey, { name: requestedName, event_id: eventId })
      .then((payload) => { if (!cancelled) setData(payload); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playerKey, requestedName, eventId]);

  const player = data?.player || {};
  const name = data?.name || player.display_name || player.name || requestedName || playerKey;

  useEffect(() => {
    setPageSeo({
      title: name ? `${name} | NinkoSports` : "Player | NinkoSports",
      description: name ? `${name} player information and matches on NinkoSports.` : "Player profile on NinkoSports.",
      path: window.location.pathname + window.location.search,
      noindex: !data?.available,
    });
  }, [name, data?.available]);

  if (loading) return <div className="entity-page"><div className="entity-card entity-loading">Loading player…</div></div>;
  if (error || !data?.available) {
    return <div className="entity-page"><Link className="entity-back" to={backPath}>← Back</Link><section className="entity-card"><h1>{name || "Player"}</h1><p>Player data is not available yet.</p></section></div>;
  }

  const fields = [
    ["Date of birth", player.birth_date],
    ["Age", player.age],
    ["Height", player.height_cm != null ? `${player.height_cm} cm` : null],
    ["Preferred foot", player.preferred_foot],
    ["Contract until", player.contract_end],
    ["Number", player.number ?? player.jerseyNumber],
    ["Position", player.position],
    ["Nationality", player.nationality || player.country || player.country_id],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  const matchFields = [
    ["Rating", player.rating],
    ["Minutes", player.minutes],
    ["Goals", player.goals],
    ["Assists", player.assists],
    ["Points", player.points],
    ["Rebounds", player.rebounds],
    ["Tackles", player.tackles],
    ["Shots", player.shots],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <div className="entity-page">
      <Link className="entity-back" to={backPath}>← Back</Link>
      <header className="entity-hero">
        <PlayerAvatar player={player} name={name} />
        <div>
          <p className="kicker">Player</p>
          <h1>{name}</h1>
          {player.current_club ? <Link className="player-club-link" to={teamProfilePath(player.current_club,{sport:"football"})}>
            <img src={player.current_club.logo} width="24" height="24" alt="" />{player.current_club.name}{player.current_club.on_loan ? " · On loan" : ""}
          </Link> : null}
          {player.captain ? <span className="entity-badge">Captain</span> : null}
        </div>
      </header>
      <div className="entity-grid">
        <div>
          {player.season_summary?.stats?.length ? <section className="entity-card">
            <div className="entity-card-head"><h2>{player.season_summary.competition} · {player.season_summary.season}</h2></div>
            <dl className="player-season-grid">{player.season_summary.stats.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
          </section> : null}
          <AppearanceList rows={data.appearances} />
          {player.career?.length ? <section className="entity-card">
            <div className="entity-card-head"><h2>Career & club moves</h2></div>
            <ol className="player-career">{player.career.map((row,index)=><li key={`${row.team_id}-${row.start}-${index}`}>
              <div><Link to={teamProfilePath({id:row.team_id,name:row.team},{sport:"football"})}>{row.team}</Link>
                <small>{row.start || "—"} – {row.active ? "Present" : row.end || "—"}{row.transfer_type ? ` · ${row.transfer_type}` : ""}{row.uncertain ? " · Provisional data" : ""}</small></div>
              <span>{row.appearances != null ? `${row.appearances} appearances` : ""}{row.goals != null ? ` · ${row.goals} goals` : ""}</span>
            </li>)}</ol>
          </section> : null}
        </div>
        <aside>
          {player.market_value?.currency && Number.isFinite(player.market_value?.amount) ? <section className="entity-card player-value-card">
            <div className="entity-card-head"><h2>Estimated market value</h2></div>
            <strong>{new Intl.NumberFormat("en",{style:"currency",currency:player.market_value.currency,notation:"compact",maximumFractionDigits:1}).format(player.market_value.amount)}</strong>
            <p>{player.market_value.as_of ? `Valuation date: ${player.market_value.as_of}. ` : ""}An estimate, not a transfer fee.</p>
          </section> : null}
          {matchFields.length ? <section className="entity-card">
            <div className="entity-card-head"><h2>Recorded match performance</h2></div>
            <p>From an available match record, not season totals.</p>
            <dl className="entity-facts">{matchFields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl>
          </section> : null}
          {fields.length ? (
            <section className="entity-card">
              <div className="entity-card-head"><h2>Player details</h2></div>
              <dl className="entity-facts">
                {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}
              </dl>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
