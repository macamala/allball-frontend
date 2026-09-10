import React from "react";

export default function LiveScoresRail({ scores }) {
  const live =
    scores?.connected && Array.isArray(scores.matches) && scores.matches.length > 0
      ? scores.matches
      : [];
  if (!live.length) return null;
  return (
    <section className="rail-module" aria-label="Live scores">
      <h2 className="rail-title">Live scores</h2>
      <ul className="rail-list">
        {live.slice(0, 8).map((match) => (
          <li key={match.id || match.title}>{match.title || match.name}</li>
        ))}
      </ul>
    </section>
  );
}
