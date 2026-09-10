import React from "react";
import ArticleCard from "../ArticleCard.jsx";

export default function RelatedStories({ articles = [] }) {
  if (!articles.length) return null;
  return (
    <section className="article-related-section">
      <h2 className="section-title">Related stories</h2>
      <div className="card-grid article-related-grid">
        {articles.map((item) => (
          <ArticleCard key={item.id || item.slug} article={item} variant="compact" />
        ))}
      </div>
    </section>
  );
}
