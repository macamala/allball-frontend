import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArticles, peekArticles } from "../api.js";
import { getSport } from "../config/sports.js";
import { breadcrumbJsonLd, setPageSeo } from "../lib/seo.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { sportI18nKey } from "../i18n/index.js";
import { isPremiumArticle, premiumFirst } from "../lib/quality.js";
import LatestFeed from "../components/LatestFeed.jsx";
import Breadcrumbs from "../components/Breadcrumbs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import HeroStories from "../components/HeroStories.jsx";
import SportDesk from "../components/SportDesk.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import NotFoundPage from "./NotFoundPage.jsx";

export default function SportPage() {
  const { sportSlug } = useParams();
  const sport = getSport(sportSlug);
  const apiSport = sportSlug === "other-sports" ? "other" : sportSlug;
  const cachedList = peekArticles({ sport: apiSport, limit: 100 });
  const [articles, setArticles] = useState(
    Array.isArray(cachedList) ? cachedList : []
  );
  const [loading, setLoading] = useState(!cachedList);
  const [error, setError] = useState("");
  const { favorites, syncFavorites } = useAuth();
  const { t } = useI18n();

  const label = sport ? t(sportI18nKey(sport.slug) || "sport.label") : t("sport.label");
  const followed = (favorites.sports || []).includes(apiSport);

  useEffect(() => {
    const crumbs = [
      { name: t("nav.home"), path: "/" },
      { name: label, path: sport?.path || `/${sportSlug}` },
    ];
    setPageSeo({
      title: `${label} | NinkoSports`,
      description: `Latest ${label} news from NinkoSports.`,
      path: sport?.path || `/${sportSlug}`,
      jsonLd: breadcrumbJsonLd(crumbs),
    });
  }, [label, sport, sportSlug, t]);

  useEffect(() => {
    if (!sport) return undefined;
    let cancelled = false;
    const params = { sport: apiSport, limit: 100 };
    const cached = peekArticles(params);
    if (cached) {
      setArticles(Array.isArray(cached) ? cached : []);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getArticles(params)
      .then((rows) => {
        if (!cancelled) {
          setArticles(Array.isArray(rows) ? rows : []);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("empty.sportFail"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiSport, sport, t]);

  if (!sport) return <NotFoundPage />;

  const isolated = articles.filter(isPremiumArticle);
  const { premium, rest } = premiumFirst(isolated);
  const compactEmpty = apiSport === "tennis" || apiSport === "motorsport";

  return (
    <div className="page-sport">
      <Breadcrumbs items={[{ name: t("nav.home"), path: "/" }, { name: label }]} />
      <div className="page-heading">
        <div>
          <p className="section-eyebrow">{t("section.sport")}</p>
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
              {league.catchAll
                ? t("otherLeagues")
                : league.path === "international"
                  ? t("international")
                  : league.label}
            </Link>
          ))}
        </div>
      )}

      {loading && <CardSkeleton count={compactEmpty ? 3 : 6} />}
      {error && <EmptyState compact title={error} />}
      {!loading && !error && isolated.length === 0 && (
        <EmptyState
          compact
          title={t("empty.sportNone", { sport: label })}
          body={t("empty.sportNoneBody")}
        />
      )}
      {!loading && isolated.length > 0 && (
        <>
          <HeroStories articles={premium.slice(0, 4)} />
          <div className="sport-mix">
            {[...premium.slice(4, 8), ...rest.slice(0, 4)].length > 0 && (
              <SportDesk articles={[...premium.slice(4, 8), ...rest.slice(0, 4)]} />
            )}
            <LatestFeed articles={[...premium.slice(8), ...rest.slice(4)]} />
          </div>
        </>
      )}
    </div>
  );
}
