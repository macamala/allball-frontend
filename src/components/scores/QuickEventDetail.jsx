import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMatch } from "../../api.js";
import { useI18n } from "../../context/I18nContext.jsx";
import { competitionLabel } from "../../labels.js";
import { eventPath, formatEventDateTime, normalizeEvent, participantName } from "../../lib/sportsData.js";
import { freshnessLabel, periodRows, sportScoreText, statusLabel } from "../../lib/scorePresentation.js";

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
}

function cleanText(value) {
  const text = String(value || "");
  if (/source_|provider_id|source_family|obs_signature/i.test(text)) return "";
  return text;
}

export default function QuickEventDetail({ event, onClose }) {
  const { t, dateLocale } = useI18n();
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMatch(event.id)
      .then((payload) => {
        if (cancelled) return;
        const next = payload?.event || payload?.header;
        setDetail(next ? normalizeEvent(next) : event);
      })
      .catch(() => {
        if (!cancelled) setDetail(event);
      });
    return () => {
      cancelled = true;
    };
  }, [event]);

  const row = detail || event;
  const sets = periodRows(row);
  const incidents = asList(row.incidents).slice(0, 6);
  const lineups = asList(row.lineups).slice(0, 8);
  const updated = freshnessLabel(row.updated_at);
  const facts = [
    row.venue ? [t("match.venue"), row.venue] : null,
    row.round ? [t("live.round"), row.round] : null,
    row.status ? [t("match.status"), statusLabel(row, t, "")] : null,
    row.session_type ? [t("match.session"), row.session_type] : null,
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
      {incidents.length ? (
        <ul className="score-quick-list">
          {incidents.map((item, index) => {
            const text = [item.minute != null ? `${item.minute}’` : "", item.player || item.name, cleanText(item.type)]
              .filter(Boolean)
              .join(" · ");
            return text ? <li key={item.id || index}>{text}</li> : null;
          })}
        </ul>
      ) : null}
      {lineups.length ? (
        <p className="score-quick-note">
          {t("match.lineups")}: {lineups.map((item) => item.name || item.label).filter(Boolean).slice(0, 4).join(", ")}
        </p>
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
