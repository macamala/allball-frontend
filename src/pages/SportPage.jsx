import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArticles } from "../api.js";
import { getSport } from "../config/sports.js";
import { breadcrumbJsonLd, setPageSeo } from "../lib/seo.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { isPremiumArticle, premiumFirst } from "../lib/quality.js";
import ArticleCard from "../components/ArticleCard.jsx";
import Breadcrumbs from "../components/Breadcrumbs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import HeroStories from "../components/HeroStories.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import NotFoundPage from "./NotFoundPage.jsx";

export default function SportPage() {
  const { sportSlug } = useParams();
  const sport = getSport(sportSlug);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { favorites, syncFavorites } = useAuth();
  const { t } = useI18n();

  const apiSport = sportSlug === "other-sports" ? "other" : sportSlug;
  const label = sport?.label || "Sport";
  const followed = (favorites.sports || []).includes(apiSport);

  useEffect(() => {
    const crumbs = [
      { name: "Home", path: "/" },
      { name: label, path: sport?.path || `/${sportSlug}` },
    ];
    setPageSeo({
      title: `${label} news | NinkoSports`,
      description: `Latest ${label} news from NinkoSports.`,
      path: sport?.path || `/${sportSlug}`,
      jsonLd: breadcrumbJsonLd(crumbs),
    });
  }, [label, sport, sportSlug]);

  useEffect(() => {
    if (!sport) return undefined;
    let cancelled = false;
    setLoading(true);
    getArticles({ sport: apiSport, limit: 100 })
      .then((rows) => {
        if (!cancelled) {
          setArticles(Array.isArray(rows) ? rows : []);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load this sport.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiSport, sport]);

  if (!sport) return <NotFoundPage />;

  const isolated = articles.filter(isPremiumArticle);
  const { premium, rest } = premiumFirst(isolated);

  return (
    <div className="page-sport">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: label }]} />
      <div className="page-heading">
        <div>
          <p className="section-eyebrow">Sport</p>
          <h1>{label}</h1>
        </div>
        <button
          type="button"
          className={followed ? "btn btn-ghost is-on" : "btn btn-ghost"}
          onClick={() => {
            const sports = followed
              ? (favorites.sports || []).filter((item) => item !== apiSport)
              : [...(favorites.sports || []), apiSport];
            syncFavorites({ ...favorites, sports });
          }}
        >
          {followed ? t("following") : t("follow")}
        </button>
      </div>

      {sport?.leagues?.length > 0 && (
        <div className="league-nav">
          {sport.leagues.map((league) => (
            <Link key={league.path} to={`${sport.path}/${league.path}`}>
              {league.label}
            </Link>
          ))}
        </div>
      )}

      {loading && <CardSkeleton count={6} />}
      {error && <EmptyState title={error} />}
      {!loading && !error && isolated.length === 0 && (
        <EmptyState
          title={`No ${label} stories yet`}
          body="This section will fill as soon as NinkoSports publishes coverage."
        />
      )}
      {!loading && isolated.length > 0 && (
        <>
          <HeroStories articles={premium.slice(0, 4)} />
          <div className="sport-story-list">
            {[...premium.slice(4), ...rest].map((article) => (
              <ArticleCard key={article.id} article={article} variant="row" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
