import React from "react";
import { Link } from "react-router-dom";
import ArticleImage from "./ArticleImage.jsx";
import { articleDate, competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";

function Kicker({ article, t }) {
  const sportKey = sportI18nKey(article.sport);
  const sport = sportKey ? t(sportKey) : "";
  const league = article.league
    ? competitionLabel(article.league, article.league_label)
    : "";
  return (
    <div className="pill-row">
      {sport ? <span className="pill">{sport}</span> : null}
      {league ? <span className="pill pill-league">{league}</span> : null}
    </div>
  );
}

export default function HeroStories({ articles = [] }) {
  const { t, dateLocale } = useI18n();
  if (!articles.length) return null;
  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 4);
  const deck = (lead.summary || "").trim();
  const showDeck =
    deck && deck.toLowerCase() !== String(lead.title || "").toLowerCase();

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
            <Kicker article={lead} t={t} />
            <h1>{lead.title}</h1>
            {showDeck ? <p>{deck}</p> : null}
            <time dateTime={lead.published_at || lead.created_at}>
              {articleDate(lead, dateLocale)}
            </time>
          </div>
        </Link>
      </article>
      <div className="hero-side">
        {secondary.map((article) => (
          <article key={article.slug} className="hero-side-item">
            <Link to={`/article/${article.slug}`}>
              <ArticleImage
                src={article.image_url}
                alt=""
                wrapperClassName="hero-side-media"
              />
              <div className="hero-side-copy">
                <Kicker article={article} t={t} />
                <h2>{article.title}</h2>
                <time dateTime={article.published_at || article.created_at}>
                  {articleDate(article, dateLocale)}
                </time>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
