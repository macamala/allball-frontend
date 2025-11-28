import React from "react";
import { Link } from "react-router-dom";

function ArticleCard({ article }) {
  const {
    title,
    summary,
    image_url,
    sport,
    league,
    country,
    created_at,
    slug
  } = article;

  const dateStr = created_at
    ? new Date(created_at).toLocaleString()
    : "";

  return (
    <Link
      to={`/article/${slug}`}
      className="article-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {image_url && (
        <div className="article-image-wrapper">
          <img src={image_url} alt={title} className="article-image" />
        </div>
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
