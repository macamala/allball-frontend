import React from "react";
import { formatEventTime, isConfirmedLive } from "../../lib/sportsData.js";
import { statusLabel } from "../../lib/scorePresentation.js";

export default function EventStatus({ event, t, locale }) {
  const time = formatEventTime(event, locale);
  const label = statusLabel(event, t, time);
  const live = isConfirmedLive(event);
  return (
    <div className={`score-status-col ${live ? "is-live" : ""}`}>
      {live ? <span className="live-dot" aria-hidden="true" /> : null}
      <span className="score-status-text">{label}</span>
    </div>
  );
}
