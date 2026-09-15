import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMatch } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";
import { normalizeEvent, participantName, scoreLine } from "../lib/sportsData.js";
import ProviderPending from "../components/ProviderPending.jsx";

function Section({ title, show, children }) {
  if (!show) return null;
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function MatchPage() {
  const { t } = useI18n();
  const { matchId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    setPageSeo({
      title: `${t("match.center")} | NinkoSports`,
      description: t("match.readyBody"),
      path: `/match/${matchId}`,
      noindex: true,
    });
    getMatch(matchId).then(setData).catch(() => setData({ connected: false }));
  }, [matchId, t]);

  const event = normalizeEvent(data?.event || data?.header);
  const home = participantName(event?.home);
  const away = participantName(event?.away);
  const score = scoreLine(event);
  const lineups = data?.lineups;
  const statistics = data?.statistics;
  const h2h = Array.isArray(data?.h2h) ? data.h2h : [];
  const form = data?.form;
  const availability = Array.isArray(data?.availability) ? data.availability : [];

  return (
    <div className="page-match">
      <h1>
        {home && away ? `${home} ${t("predictions.vs")} ${away}` : t("match.center")}
      </h1>
      {event?.competition ? <p className="lede">{event.competition}</p> : (
        <p className="lede">{t("match.readyBody")}</p>
      )}
      {event ? (
        <div className="match-grid">
          <section className="panel">
            <h2>{event.competition || t("liveScores")}</h2>
            <p>{score || event.status}</p>
          </section>
          <Section title={t("predictions.recentForm")} show={Boolean(form)}>
            {form?.home?.summary ? <p>{form.home.summary}</p> : null}
            {form?.away?.summary ? <p>{form.away.summary}</p> : null}
          </Section>
          <Section title={t("predictions.statistics")} show={Boolean(statistics)}>
            <p>{typeof statistics === "string" ? statistics : ""}</p>
          </Section>
          <Section title={t("match.lineups")} show={Boolean(lineups)}>
            <p>{typeof lineups === "string" ? lineups : ""}</p>
          </Section>
          <Section title={t("predictions.h2h")} show={h2h.length > 0}>
            <ul>
              {h2h.map((row, index) => (
                <li key={row.id || index}>{row.label || row.summary}</li>
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
        </div>
      ) : (
        <ProviderPending title={t("match.readyTitle")} body={data?.message || t("match.readyBody")} />
      )}
    </div>
  );
}
