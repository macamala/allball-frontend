import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getArticles, searchArticles } from "../api.js";
import { useI18n } from "../context/I18nContext.jsx";
import { loadTeamNews, teamNewsIdentity } from "../lib/teamNews.js";
import ArticleCard from "./ArticleCard.jsx";
import "../styles/teamNews.css";

export default function TeamNews({ profile }) {
  const { t } = useI18n();
  const identity = useMemo(() => teamNewsIdentity(profile), [profile]);
  const [result, setResult] = useState({ key: "", rows: [], pending: true, partial: false });
  const [visible, setVisible] = useState(12);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setVisible(12);
    if (!identity) return undefined;
    setResult({ key: identity.key, rows: [], pending: true, partial: false });
    const timer = setTimeout(() => {
      if (!active) return;
      setResult({ key: identity.key, rows: [], pending: false, partial: true });
      active = false;
    }, 15000);
    loadTeamNews(identity, { getArticles, searchArticles }, () => active)
      .then((data) => { if (active) setResult({ ...data, key: identity.key, pending: false }); })
      .catch(() => { if (active) setResult({ key: identity.key, rows: [], pending: false, partial: true }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); };
  }, [identity, attempt]);
  if (!identity) return null;
  const current = result.key === identity.key ? result : { rows: [], pending: true };
  const archive = new URLSearchParams({ q: identity.aliases[0], sport: identity.sport });
  return <section className="team-news" aria-label={t("news.team", { name: identity.name })}>
    <div className="team-news-heading">
      <h2>{t("news.team", { name: identity.name })}</h2>
      <Link to={`/search?${archive}`}>{t("news.archive")}</Link>
    </div>
    {current.pending ? <p role="status">{t("loading")}</p> : <>
      {current.partial && <p role="status">{t("news.teamPartial")} <button type="button" className="btn" onClick={() => setAttempt((value) => value + 1)}>{t("live.retry")}</button></p>}
      {!current.rows.length && !current.partial && <p>{t("news.teamEmpty")}</p>}
      <div className="card-grid">{current.rows.slice(0, visible).map((article) => <ArticleCard key={article.id || article.slug} article={article} />)}</div>
      {visible < current.rows.length && <button type="button" className="btn" onClick={() => setVisible((value) => value + 12)}>{t("news.teamMore")}</button>}
    </>}
  </section>;
}
