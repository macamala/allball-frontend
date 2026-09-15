import React from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import ArticleImage from "../ArticleImage.jsx";
import ArticleLink from "../ArticleLink.jsx";

export default function InlineRelatedStory({ article }) {
  const { t } = useI18n();
  if (!article?.slug || !article?.title) return null;
  return (
    <aside className="inline-related" aria-label={t("related")}>
      <p className="inline-related-label">{t("related")}</p>
      <ArticleLink article={article} className="inline-related-link">
        <ArticleImage
          src={article.image_url}
          alt=""
          wrapperClassName="inline-related-media"
          variant="thumb"
        />
        <span className="inline-related-title">{article.title}</span>
      </ArticleLink>
    </aside>
  );
}
