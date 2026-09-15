import React from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import ArticleLink from "../ArticleLink.jsx";

export default function ArticlePager({ previous, next }) {
  const { t } = useI18n();
  if (!previous && !next) return null;
  const both = Boolean(previous && next);

  return (
    <nav
      className={both ? "article-pager" : "article-pager is-single"}
      aria-label={t("article.pager")}
    >
      {previous ? (
        <ArticleLink article={previous} className="pager-card pager-prev">
          <span className="pager-label">{t("previous")}</span>
          <strong>{previous.title}</strong>
        </ArticleLink>
      ) : null}
      {next ? (
        <ArticleLink article={next} className="pager-card pager-next">
          <span className="pager-label">{t("next")}</span>
          <strong>{next.title}</strong>
        </ArticleLink>
      ) : null}
    </nav>
  );
}
