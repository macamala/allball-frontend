import React from "react";
import { Link } from "react-router-dom";
import { articleDate, competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";
import ArticleImage from "./ArticleImage.jsx";

export default function ArticleCard({ article, variant = "grid" }) {
  const { t, dateLocale } = useI18n();
  if (!article) return null;
  const sportKey = sportI18nKey(article.sport);
  const sport = sportKey ? t(sportKey) : "";
  const league = article.league
    ? competitionLabel(article.league, article.league_label)
    : "";
  const dateStr = articleDate(article, dateLocale);
  const className = `article-card card-${variant}`;

  return (
    <article className={className}>
      <Link to={`/article/${article.slug}`} className="article-card-link">
        <ArticleImage
          src={article.image_url}
          alt=""
          wrapperClassName="card-media"
          eager={variant === "lead"}
        />
        <div className="article-card-body">
          <div className="pill-row">
            {sport && <span className="pill">{sport}</span>}
            {league && <span className="pill pill-league">{league}</span>}
          </div>
          <h3 className="article-card-title">{article.title}</h3>
          {variant !== "compact" && article.summary && (
            <p className="article-card-summary">{article.summary}</p>
          )}
          {dateStr && (
            <time
              className="article-card-date"
              dateTime={article.published_at || article.created_at}
            >
              {dateStr}
            </time>
          )}
        </div>
      </Link>
    </article>
  );
}
