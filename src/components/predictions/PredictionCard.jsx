import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext.jsx";
import {
  displayConfidence,
  formatPercent,
  normalizeEvent,
  outcomePercents,
  participantName,
  predictionPath,
  visibleEvidence,
} from "../../lib/sportsData.js";

function kickoffLabel(event, locale) {
  if (!event?.start_time) return "";
  const date = new Date(event.start_time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export default function PredictionCard({
  event,
  prediction,
  sportSlug,
  competitionSlug,
}) {
  const { t, lang } = useI18n();
  const normalized = normalizeEvent(event);
  if (!normalized?.id) return null;
  const home = participantName(normalized.home);
  const away = participantName(normalized.away);
  const odds = outcomePercents(prediction, normalized.sport || sportSlug);
  const confidence = displayConfidence(prediction);
  const evidence = visibleEvidence(prediction);
  const href = predictionPath(sportSlug, competitionSlug, normalized.id);
  const score =
    prediction &&
    prediction.predicted_score_home != null &&
    prediction.predicted_score_away != null
      ? `${prediction.predicted_score_home}–${prediction.predicted_score_away}`
      : "";

  return (
    <Link to={href} className="prediction-card">
      <div className="prediction-card-meta">
        <span>{normalized.competition}</span>
        <span>{kickoffLabel(normalized, lang === "sr" ? "sr-Latn-RS" : lang)}</span>
      </div>
      <div className="prediction-card-teams">
        <strong>{home}</strong>
        <span className="prediction-vs">{t("predictions.vs")}</span>
        <strong>{away}</strong>
      </div>
      {prediction && odds.length ? (
        <>
          <p className="prediction-pick-label">{t("predictions.pick")}</p>
          <div
            className={
              odds.length === 3
                ? "prediction-odds is-1x2"
                : "prediction-odds is-winner"
            }
          >
            {odds.map((row) => (
              <div key={row.key} className="prediction-odd">
                <span className="prediction-odd-label">
                  {row.key === "home"
                    ? home
                    : row.key === "away"
                      ? away
                      : t("predictions.draw")}
                </span>
                <span className="prediction-odd-value">{formatPercent(row.value)}</span>
              </div>
            ))}
          </div>
          {score ? (
            <p className="prediction-score">
              {t("predictions.predictedScore")}: {score}
            </p>
          ) : null}
          {confidence ? (
            <p className="prediction-confidence">
              {t("predictions.confidence")}: {t(`predictions.confidence.${confidence}`)}
            </p>
          ) : null}
          {evidence.length ? (
            <ul className="prediction-chips">
              {evidence.slice(0, 4).map((item) => (
                <li key={`${item.type}-${item.team || item.label}`}>
                  {item.label || item.type}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="prediction-awaiting">{t("predictions.readyTitle")}</p>
      )}
    </Link>
  );
}
