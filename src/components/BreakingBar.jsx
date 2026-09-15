import React from "react";
import ArticleLink from "./ArticleLink.jsx";

export default function BreakingBar({ articles = [] }) {
  if (!articles.length) return null;
  return (
    <div className="breaking-bar" role="region" aria-label="Breaking news">
      <span className="breaking-label">Breaking</span>
      <div className="breaking-items">
        {articles.map((article) => (
          <ArticleLink key={article.slug} article={article}>
            {article.title}
          </ArticleLink>
        ))}
      </div>
    </div>
  );
}
