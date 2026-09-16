import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { getArticles, getJSON, getRegistry, peekArticles } from "../api.js";
import { getSport } from "../config/sports.js";
import {
  CATEGORY_I18N,
  groupedDirectorySports,
  hydrateRegistry,
  motorsportSeries,
} from "../config/sportsRegistry.js";
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

function mergeDirectory(countsBySlug) {
  return groupedDirectorySports().map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      article_count: Number(countsBySlug[item.slug]?.article_count || 0),
      label: countsBySlug[item.slug]?.label || item.name,
    })),
  }));
}

export default function SportPage() {
  const { sportSlug } = useParams();
  const location = useLocation();
  const sport = getSport(sportSlug);
  const apiSport = sportSlug === "other-sports" ? "other" : sport?.slug || sportSlug;
  const cachedList = peekArticles({ sport: apiSport, limit: 100 });
  const [articles, setArticles] = useState(
    Array.isArray(cachedList) ? cachedList : []
  );
  const [loading, setLoading] = useState(!cachedList);
  const [error, setError] = useState("");
  const [directory, setDirectory] = useState(mergeDirectory({}));
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
    if (apiSport === "other") {
      Promise.allSettled([getRegistry(), getJSON("/meta/taxonomy")])
        .then(([registryResult, taxonomyResult]) => {
          if (cancelled) return;
          const registry = registryResult.status === "fulfilled" ? registryResult.value : null;
          const taxonomy = taxonomyResult.status === "fulfilled" ? taxonomyResult.value : null;
          if (registry?.sports?.length) hydrateRegistry(registry);
          const bySlug = {};
          (taxonomy?.sports || registry?.sports || []).forEach((row) => {
            bySlug[row.sport || row.slug] = row;
          });
          setDirectory(mergeDirectory(bySlug));
        })
        .catch(() => {
          if (!cancelled) setDirectory(mergeDirectory({}));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [apiSport, sport, t]);

  if (!sport) return <NotFoundPage />;

  const canonical = sport.path;
  const aliases = [`/${sport.slug}`, `/sports/${sport.slug}`];
  if (canonical && aliases.includes(location.pathname) && location.pathname !== canonical) {
    return <Navigate to={canonical} replace />;
  }

  const isolated = articles.filter(isPremiumArticle);
  const { premium, rest } = premiumFirst(isolated);
  const compactEmpty = apiSport === "tennis" || apiSport === "motorsport";
  const series = motorsportSeries();

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

      {apiSport === "other" && (
        <section className="other-directory" aria-label={t("other.directory")}>
          <h2>{t("other.directory")}</h2>
          <p className="lede">{t("other.directoryBody")}</p>
          {directory.map((group) => (
            <div key={group.category} className="other-directory-group">
              <h3>{t(CATEGORY_I18N[group.category] || "directory.other")}</h3>
              <div className="other-directory-grid">
                {group.items.map((item) => (
                  <Link key={item.slug} to={item.path} className="other-directory-card">
                    <strong>{t(sportI18nKey(item.slug)) || item.label || item.name}</strong>
                    <span>
                      {item.article_count > 0
                        ? `${item.article_count}`
                        : t("other.noStories")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="other-directory-group">
            <h3>{t("directory.motorsport")}</h3>
            <div className="other-directory-grid">
              {series.map((item) => (
                <Link key={item.slug} to={item.path} className="other-directory-card">
                  <strong>{item.name}</strong>
                  <span>{t("directory.browse")}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {loading && <CardSkeleton count={compactEmpty ? 3 : 6} />}
      {error && <EmptyState compact title={error} />}
      {!loading && !error && isolated.length === 0 && apiSport !== "other" && (
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
