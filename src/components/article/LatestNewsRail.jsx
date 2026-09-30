import React from "react";
import ArticleImage from "../ArticleImage.jsx";
import ArticleLink from "../ArticleLink.jsx";
import { useTranslatedNews } from "../../lib/useTranslatedNews.js";
import { useI18n } from "../../context/I18nContext.jsx";

export default function LatestNewsRail({ articles = [], currentSlug }) {
  const { t } = useI18n();
  const rows = useTranslatedNews(articles.filter((item) => item?.slug && item.slug !== currentSlug).slice(0, 8));
  if (!rows.length) return null;
  return (
    <section className="rail-module" aria-label={t("latest")}>
      <h2 className="rail-title">{t("latest")}</h2>
      <ul className="rail-list">
        {rows.map((article) => (
          <li key={article.id || article.slug}>
            <ArticleLink article={article} className="rail-item">
              <ArticleImage
                src={article.image_url}
                alt=""
                wrapperClassName="rail-thumb"
                variant="thumb"
              />
              <span>{article.title}</span>
            </ArticleLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
