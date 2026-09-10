import React from "react";
import { Link } from "react-router-dom";

export default function BreakingBar({ articles = [] }) {
  if (!articles.length) return null;
  return (
    <div className="breaking-bar" role="region" aria-label="Breaking news">
      <span className="breaking-label">Breaking</span>
      <div className="breaking-items">
        {articles.map((article) => (
          <Link key={article.slug} to={`/article/${article.slug}`}>
            {article.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
