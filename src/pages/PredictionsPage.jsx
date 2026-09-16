import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getPredictions, getSportsDataCompetitions } from "../api.js";
import { MAIN_SPORTS, getSport, resolveLeague } from "../config/sports.js";
import { predictionRegistrySports } from "../config/sportsRegistry.js";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";
import {
  browseCompetitions,
  groupEventsByDate,
  isoDate,
  normalizeEvent,
  periodRange,
  predictionPath,
} from "../lib/sportsData.js";
import ProviderPending from "../components/ProviderPending.jsx";
import PredictionCard from "../components/predictions/PredictionCard.jsx";

const PERIODS = [
  { id: "today", labelKey: "live.today" },
  { id: "tomorrow", labelKey: "live.tomorrow" },
  { id: "this-week", labelKey: "predictions.thisWeek" },
  { id: "next-7", labelKey: "predictions.next7" },
];

const PREDICTION_SPORTS = predictionRegistrySports().map((row) => ({
  slug: row.slug,
  label: row.name,
  path: row.path,
  leagues: MAIN_SPORTS.find((sport) => sport.slug === row.slug)?.leagues || [],
}));

export default function PredictionsPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { sportSlug, competitionSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get("period") || "this-week";
  const [payload, setPayload] = useState(null);
  const [providerCompetitions, setProviderCompetitions] = useState([]);

  const sport =
    !sportSlug || PREDICTION_SPORTS.some((item) => item.slug === sportSlug)
      ? getSport(sportSlug)
      : null;
  const league = competitionSlug ? resolveLeague(sportSlug, competitionSlug) : null;
  const competitions = useMemo(
    () => browseCompetitions(sport, providerCompetitions),
    [sport, providerCompetitions]
  );

  useEffect(() => {
    const path = predictionPath(sportSlug, competitionSlug);
    setPageSeo({
      title: sport
        ? `${t("predictions")} · ${t(`sport.${sport.slug}`)} | NinkoSports`
        : t("seo.predictionsTitle"),
      description: t("seo.predictionsDescription"),
      path,
      noindex: Boolean(competitionSlug),
    });
  }, [t, sport, sportSlug, competitionSlug]);

  useEffect(() => {
    let cancelled = false;
    if (!sportSlug || !PREDICTION_SPORTS.some((item) => item.slug === sportSlug)) {
      setPayload({ connected: false, items: [] });
      return undefined;
    }
    const range = periodRange(period);
    getPredictions({
      sport: sportSlug,
      competition: league?.league || "",
      period,
      date_from: isoDate(range.from),
      date_to: isoDate(range.to),
    })
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setPayload({ connected: false, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [sportSlug, league?.league, period]);

  useEffect(() => {
    if (!sportSlug) {
      setProviderCompetitions([]);
      return undefined;
    }
    let cancelled = false;
    getSportsDataCompetitions(sportSlug)
      .then((data) => {
        if (!cancelled) setProviderCompetitions(data?.competitions || []);
      })
      .catch(() => {
        if (!cancelled) setProviderCompetitions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sportSlug]);

  const connected = Boolean(payload?.connected);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const events = items
    .map((item) => ({
      event: normalizeEvent(item.event || item),
      prediction: item.prediction || null,
    }))
    .filter((item) => item.event);
  const groups = groupEventsByDate(
    events.map((item) => item.event),
    lang === "sr" ? "sr-Latn-RS" : lang
  );
  const groupedCards = groups.map((group) => ({
    ...group,
    rows: group.events.map((event) =>
      events.find((item) => item.event.id === event.id)
    ),
  }));

  function selectSport(slug) {
    navigate(predictionPath(slug));
  }

  function selectCompetition(path) {
    navigate(`${predictionPath(sportSlug, path)}?period=${encodeURIComponent(period)}`);
  }

  function selectPeriod(next) {
    setSearchParams({ period: next });
  }

  return (
    <div className="page-predictions">
      <header className="page-heading page-predictions-heading">
        <div>
          <p className="kicker">{t("predictions")}</p>
          <h1>{t("predictions.title")}</h1>
          <p className="lede">{t("predictions.lede")}</p>
        </div>
      </header>

      <div className="filter-chips" role="tablist" aria-label={t("predictions.chooseSport")}>
        {PREDICTION_SPORTS.map((item) => (
          <button
            key={item.slug}
            type="button"
            className={item.slug === sportSlug ? "tab is-active" : "tab"}
            onClick={() => selectSport(item.slug)}
          >
            {t(`sport.${item.slug}`)}
          </button>
        ))}
      </div>

      {sport ? (
        <div className="filter-chips" role="tablist" aria-label={t("predictions.chooseCompetition")}>
          {competitions.map((item) => (
            <button
              key={item.path}
              type="button"
              className={item.path === competitionSlug ? "tab is-active" : "tab"}
              onClick={() => selectCompetition(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {sport ? (
        <div className="filter-chips" role="tablist" aria-label={t("predictions.period")}>
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === period ? "tab is-active" : "tab"}
              onClick={() => selectPeriod(item.id)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      ) : null}

      {!connected || !events.length ? (
        <ProviderPending
          title={t("predictions.readyTitle")}
          body={payload?.message || t("predictions.readyBody")}
        />
      ) : (
        <div className="prediction-groups">
          {groupedCards.map((group) => (
            <section key={group.date} className="prediction-date-group">
              {group.label ? <h2 className="date-group-title">{group.label}</h2> : null}
              <div className="prediction-list">
                {group.rows.filter(Boolean).map((row) => (
                  <PredictionCard
                    key={row.event.id}
                    event={row.event}
                    prediction={row.prediction}
                    sportSlug={sportSlug}
                    competitionSlug={competitionSlug}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {connected && payload?.performance_available === false ? (
        <p className="prediction-performance-note">{t("predictions.performanceSoon")}</p>
      ) : null}
    </div>
  );
}
