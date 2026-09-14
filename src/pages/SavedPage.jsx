import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";
import ArticleCard from "../components/ArticleCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function SavedPage() {
  const { saved } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    setPageSeo({
      title: `${t("nav.saved")} | NinkoSports`,
      description: t("saved.lede"),
      path: "/saved",
      noindex: true,
    });
  }, [t]);

  return (
    <div className="page-saved">
      <h1>{t("nav.saved")}</h1>
      <p className="lede">{t("saved.lede")}</p>
      {saved.length === 0 ? (
        <EmptyState
          compact
          title={t("saved.empty")}
          action={
            <Link to="/" className="btn">
              {t("nav.home")}
            </Link>
          }
        />
      ) : (
        <div className="sport-story-list">
          {saved.map((article) => (
            <ArticleCard key={article.id || article.slug} article={article} variant="row" />
          ))}
        </div>
      )}
    </div>
  );
}
