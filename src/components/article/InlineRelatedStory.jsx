import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext.jsx";
import ArticleImage from "../ArticleImage.jsx";

export default function InlineRelatedStory({ article }) {
  const { t } = useI18n();
  if (!article?.slug || !article?.title) return null;
  return (
    <aside className="inline-related" aria-label={t("related")}>
      <p className="inline-related-label">{t("related")}</p>
      <Link to={`/article/${article.slug}`} className="inline-related-link">
        <ArticleImage
          src={article.image_url}
          alt=""
          wrapperClassName="inline-related-media"
        />
        <span className="inline-related-title">{article.title}</span>
      </Link>
    </aside>
  );
}
