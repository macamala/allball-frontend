import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPrediction } from "../api.js";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";
import {
  displayConfidence,
  formatPercent,
  normalizeEvent,
  outcomePercents,
  participantName,
  predictionPath,
} from "../lib/sportsData.js";
import ProviderPending from "../components/ProviderPending.jsx";
import EvidenceList from "../components/predictions/EvidenceList.jsx";

function Section({ title, children, show }) {
  if (!show) return null;
  return (
    <section className="panel prediction-detail-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function PredictionDetailPage() {
  const { t } = useI18n();
  const { sportSlug, competitionSlug, eventId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const path = predictionPath(sportSlug, competitionSlug, eventId);
    setPageSeo({
      title: `${t("predictions")} | NinkoSports`,
      description: t("seo.predictionsDescription"),
      path,
      noindex: true,
    });
    getPrediction(eventId)
      .then(setData)
      .catch(() => setData({ connected: false, prediction: null, event: null }));
  }, [eventId, sportSlug, competitionSlug, t]);

  const event = normalizeEvent(data?.event);
  const prediction = data?.prediction || null;
  const home = participantName(event?.home);
  const away = participantName(event?.away);
  const odds = outcomePercents(prediction, event?.sport || sportSlug);
  const confidence = displayConfidence(prediction);
  const score =
    prediction &&
    prediction.predicted_score_home != null &&
    prediction.predicted_score_away != null
      ? `${prediction.predicted_score_home}–${prediction.predicted_score_away}`
      : "";
  const form = data?.form;
  const h2h = Array.isArray(data?.h2h) ? data.h2h : [];
  const availability = Array.isArray(data?.availability) ? data.availability : [];
  const standingsRows = Array.isArray(data?.standings)
    ? data.standings
    : data?.standings?.rows;
  const statistics = data?.statistics && typeof data.statistics === "object"
    ? Object.entries(data.statistics).filter(([, value]) => value != null && value !== "")
    : [];
  const heading = home && away ? `${home} ${t("predictions.vs")} ${away}` : t("predictions.title");
  const kickoff = event?.start_time ? new Date(event.start_time) : null;

  return (
    <div className="page-predictions page-prediction-detail">
      <p className="kicker">
        <Link to={predictionPath(sportSlug, competitionSlug)}>{t("predictions")}</Link>
      </p>
      <h1>{heading}</h1>
      {event?.competition ? <p className="lede">{event.competition}</p> : null}
      {kickoff && !Number.isNaN(kickoff.getTime()) ? (
        <p className="prediction-kickoff">{kickoff.toLocaleString()}</p>
      ) : null}

      {!event || !prediction ? (
        <ProviderPending
          title={t("predictions.readyTitle")}
          body={data?.message || t("predictions.readyBody")}
        />
      ) : (
        <>
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
            <p>
              {t("predictions.predictedScore")}: {score}
            </p>
          ) : null}
          {confidence ? (
            <p>
              {t("predictions.confidence")}: {t(`predictions.confidence.${confidence}`)}
            </p>
          ) : null}
          {prediction.explanation ? (
            <p className="prediction-why-copy">{prediction.explanation}</p>
          ) : null}
          <EvidenceList prediction={prediction} />
          <Section
            title={t("predictions.recentForm")}
            show={Boolean(form?.home || form?.away)}
          >
            {form?.home?.summary ? <p>{form.home.summary}</p> : null}
            {form?.away?.summary ? <p>{form.away.summary}</p> : null}
          </Section>
          <Section title={t("predictions.statistics")} show={statistics.length > 0}>
            <ul>
              {statistics.map(([key, value]) => (
                <li key={key}>
                  {key}: {String(value)}
                </li>
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
          <Section
            title={t("predictions.standings")}
            show={Array.isArray(standingsRows) && standingsRows.length > 0}
          >
            <ul>
              {(standingsRows || []).map((row, index) => (
                <li key={row.team_slug || row.team || index}>
                  {row.position ? `${row.position}. ` : ""}
                  {row.team}
                </li>
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
        </>
      )}
    </div>
  );
}
