import React from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import ArticleCard from "../ArticleCard.jsx";

export default function RelatedStories({ articles = [] }) {
  const { t } = useI18n();
  if (!articles.length) return null;
  return (
    <section className="article-related-section">
      <h2 className="section-title">{t("related")}</h2>
      <div className="card-grid article-related-grid">
        {articles.map((item) => (
          <ArticleCard key={item.id || item.slug} article={item} variant="compact" />
        ))}
      </div>
    </section>
  );
}
