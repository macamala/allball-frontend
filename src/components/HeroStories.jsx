import React from "react";
import { Link } from "react-router-dom";
import ArticleImage from "./ArticleImage.jsx";
import { articleDate, competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";

export default function HeroStories({ articles = [] }) {
  const { t, dateLocale } = useI18n();
  if (!articles.length) return null;
  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 4);
  const leadSport = sportI18nKey(lead.sport);

  return (
    <section className="hero-grid" aria-label={t("topStories")}>
      <article className="hero-lead">
        <Link to={`/article/${lead.slug}`} className="hero-lead-link">
          <ArticleImage
            src={lead.image_url}
            alt=""
            wrapperClassName="hero-lead-media"
            eager
          />
          <div className="hero-lead-copy">
            <div className="pill-row">
              {leadSport && <span className="pill">{t(leadSport)}</span>}
              {lead.league && (
                <span className="pill pill-league">
                  {competitionLabel(lead.league, lead.league_label)}
                </span>
              )}
            </div>
            <h1>{lead.title}</h1>
            {lead.summary && <p>{lead.summary}</p>}
            <time dateTime={lead.published_at || lead.created_at}>
              {articleDate(lead, dateLocale)}
            </time>
          </div>
        </Link>
      </article>
      <div className="hero-side">
        {secondary.map((article) => {
          const sportKey = sportI18nKey(article.sport);
          return (
            <article key={article.slug} className="hero-side-item">
              <Link to={`/article/${article.slug}`}>
                <ArticleImage
                  src={article.image_url}
                  alt=""
                  wrapperClassName="hero-side-media"
                />
                <div className="hero-side-copy">
                  <div className="pill-row">
                    {sportKey && <span className="pill">{t(sportKey)}</span>}
                    {article.league && (
                      <span className="pill pill-league">
                        {competitionLabel(article.league, article.league_label)}
                      </span>
                    )}
                  </div>
                  <h2>{article.title}</h2>
                  <time dateTime={article.published_at || article.created_at}>
                    {articleDate(article, dateLocale)}
                  </time>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
