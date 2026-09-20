import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext.jsx";
import { competitionLabel } from "../../labels.js";
import { eventPath, formatEventDateTime, participantName } from "../../lib/sportsData.js";
import { freshnessLabel, periodRows, sportScoreText, statusLabel } from "../../lib/scorePresentation.js";

function cleanText(value) {
  const text = String(value || "");
  if (/source_|provider_id|source_family|obs_signature/i.test(text)) return "";
  return text;
}

export default function QuickEventDetail({ event, onClose }) {
  const { t, dateLocale } = useI18n();
  const row = event;
  const sets = periodRows(row);
  const updated = freshnessLabel(row.updated_at);
  const facts = [
    row.venue ? [t("match.venue"), row.venue] : null,
    row.round ? [t("live.round"), row.round] : null,
    row.status ? [t("match.status"), statusLabel(row, t, "")] : null,
    row.session_type ? [t("match.session"), row.session_type] : null,
    row.score?.clock || row.score?.minute ? [t("match.status"), `${row.score.clock || `${row.score.minute}’`}`] : null,
    row.winner ? [t("match.winner"), cleanText(row.winner)] : null,
  ].filter((item) => item && item[1]);

  return (
    <div className="score-quick" role="region" aria-label={t("match.details")}>
      {sets.length ? (
        <table className="score-quick-sets">
          <tbody>
            <tr>
              <th>{participantName(row.home)}</th>
              {sets.map((item, index) => (
                <td key={`h-${index}`}>{item.home ?? "–"}</td>
              ))}
              <td>{sportScoreText(row)}</td>
            </tr>
            <tr>
              <th>{participantName(row.away)}</th>
              {sets.map((item, index) => (
                <td key={`a-${index}`}>{item.away ?? "–"}</td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      ) : null}
      {facts.length ? (
        <dl className="score-quick-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {row.competition ? <p className="score-quick-note">{competitionLabel(row.competition)}</p> : null}
      {formatEventDateTime(row, dateLocale) ? (
        <p className="score-quick-note">{formatEventDateTime(row, dateLocale)}</p>
      ) : null}
      {updated ? <p className="score-quick-fresh">{t("live.updatedAgo", { n: updated })}</p> : null}
      <div className="score-quick-actions">
        <Link to={eventPath(event.id)} state={{ event: row }} className="score-quick-link">
          {t("live.matchCentre")} →
        </Link>
        <button type="button" className="score-quick-close" onClick={onClose}>
          {t("nav.close")}
        </button>
      </div>
    </div>
  );
}
