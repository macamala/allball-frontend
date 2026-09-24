import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPlayerProfile } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import {
  eventPath,
  formatEventDateTime,
  normalizeEvent,
  participantName,
  publicEventSafe,
  scoreLine,
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
  const [search] = useSearchParams();
  const requestedName = search.get("name") || "";
  const eventId = search.get("event_id") || "";
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
    return <div className="entity-page"><Link className="entity-back" to={eventId ? eventPath(eventId) : "/live-scores"}>← Back</Link><section className="entity-card"><h1>{name || "Player"}</h1><p>Player data is not available yet.</p></section></div>;
  }

  const fields = [
    ["Number", player.number ?? player.jerseyNumber],
    ["Position", player.position],
    ["Nationality", player.country_id || player.country || player.nationality],
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
      <Link className="entity-back" to={eventId ? eventPath(eventId) : "/live-scores"}>← Back</Link>
      <header className="entity-hero">
        <PlayerAvatar player={player} name={name} />
        <div>
          <p className="kicker">Player</p>
          <h1>{name}</h1>
          {player.captain ? <span className="entity-badge">Captain</span> : null}
        </div>
      </header>
      <div className="entity-grid">
        <div><AppearanceList rows={data.appearances} /></div>
        <aside>
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
