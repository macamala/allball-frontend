import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext.jsx";

export default function ArticlePager({ previous, next }) {
  const { t } = useI18n();
  if (!previous && !next) return null;

  return (
    <nav className="article-pager" aria-label={t("article.pager")}>
      {previous ? (
        <Link to={`/article/${previous.slug}`} className="pager-card pager-prev">
          <span className="pager-label">{t("previous")}</span>
          <strong>{previous.title}</strong>
        </Link>
      ) : (
        <span className="pager-card is-empty" />
      )}
      {next ? (
        <Link to={`/article/${next.slug}`} className="pager-card pager-next">
          <span className="pager-label">{t("next")}</span>
          <strong>{next.title}</strong>
        </Link>
      ) : (
        <span className="pager-card is-empty" />
      )}
    </nav>
  );
}
