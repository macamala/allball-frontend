import React from "react";
import { Link } from "react-router-dom";
import {
  articleDate,
  competitionLabel,
  countryLabel,
  sportLabel,
} from "./labels.js";

function ArticleCard({ article }) {
  const title = article.title;
  const summary = article.summary;
  const imageUrl = article.image_url;
  const slug = article.slug;
  const dateStr = articleDate(article);
  const sport = sportLabel(article.sport, article.sport_label);
  const league = competitionLabel(article.league, article.league_label);
  const country = countryLabel(article.country, article.country_label);

  return (
    <Link to={`/article/${slug}`} className="article-card">
      {imageUrl ? (
        <div className="article-image-wrapper">
          <img src={imageUrl} alt={title} className="article-image" />
        </div>
      ) : (
        <div className="article-image-wrapper article-image-placeholder" aria-hidden="true" />
      )}

      <div className="article-content">
        <div className="article-meta">
          {sport && <span className="tag">{sport}</span>}
          {league && <span className="tag secondary">{league}</span>}
          {country && <span className="tag country-tag">{country}</span>}
        </div>

        <h2 className="article-title">{title}</h2>

        {summary && <p className="article-summary">{summary}</p>}

        <div className="article-footer">
          {dateStr && <span className="article-date">{dateStr}</span>}
        </div>
      </div>
    </Link>
  );
}

export default ArticleCard;
