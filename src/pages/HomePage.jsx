import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPortalHome } from "../api.js";
import { MAIN_SPORTS, leaguePath, sportPath } from "../config/sports.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { sportI18nKey } from "../i18n/index.js";
import { setPageSeo, websiteJsonLd } from "../lib/seo.js";
import ArticleCard from "../components/ArticleCard.jsx";
import BreakingBar from "../components/BreakingBar.jsx";
import EmptyState from "../components/EmptyState.jsx";
import HeroStories from "../components/HeroStories.jsx";
import LiveScoresRail, { hasLiveUtilityData } from "../components/LiveScoresRail.jsx";
import PortalLayout from "../components/PortalLayout.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { HeroSkeleton, CardSkeleton } from "../components/Skeleton.jsx";

export default function HomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { favorites } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    setPageSeo({
      title: t("seo.homeTitle"),
      description: t("seo.homeDescription"),
      path: "/",
      jsonLd: websiteJsonLd(),
    });
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPortalHome()
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("empty.homeFail"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const sportOrder = useMemo(() => {
    const slugs = MAIN_SPORTS.map((item) => item.slug);
    const fav = (favorites.sports || []).filter((slug) => slugs.includes(slug));
    return [...fav, ...slugs.filter((slug) => !fav.includes(slug))];
  }, [favorites]);

  if (loading) {
    return (
      <div className="page-home">
        <HeroSkeleton />
        <CardSkeleton count={6} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t("empty.loadFail")} body={error} compact />;
  }

  const featured = data?.featured || [];
  const latest = data?.latest || [];
  const breaking = data?.breaking || [];
  const mostRead = data?.most_read || [];
  const bySport = data?.by_sport || {};
  const byLeague = data?.by_league || [];
  const scores = data?.sports_data;
  const liveRail = hasLiveUtilityData(scores) ? <LiveScoresRail scores={scores} /> : null;

  return (
    <div className="page-home">
      <BreakingBar articles={breaking} />
      <PortalLayout right={liveRail}>
        {featured.length > 0 ? (
          <HeroStories articles={featured} />
        ) : (
          <EmptyState
            compact
            title={t("empty.noStories")}
            body={t("empty.noStoriesBody")}
          />
        )}

        <div className="editorial-split">
          {latest.length > 0 && (
            <section className="section">
              <SectionHeader eyebrow={t("section.sport")} title={t("latest")} />
              <div className="home-card-grid">
                {latest.slice(0, 6).map((article) => (
                  <ArticleCard key={article.id} article={article} variant="row" />
                ))}
              </div>
            </section>
          )}
          {mostRead.length > 0 && (
            <section className="section">
              <SectionHeader title={t("mostRead")} />
              <div className="home-card-grid">
                {mostRead.slice(0, 5).map((article) => (
                  <ArticleCard key={`mr-${article.id}`} article={article} variant="compact" />
                ))}
              </div>
            </section>
          )}
        </div>

        {sportOrder.map((slug) => {
          const articles = bySport[slug] || [];
          if (!articles.length) return null;
          const key = sportI18nKey(slug);
          return (
            <section className="section" key={slug}>
              <SectionHeader
                eyebrow={t("section.sport")}
                title={key ? t(key) : slug}
                to={sportPath(slug)}
                action={t("seeAll")}
              />
              <div className="home-sport-grid">
                {articles.slice(0, 4).map((article) => (
                  <ArticleCard key={article.id} article={article} variant="row" />
                ))}
              </div>
            </section>
          );
        })}

        {byLeague.map((group) => (
          <section className="section" key={group.league}>
            <SectionHeader
              eyebrow={t("section.competition")}
              title={group.label}
              to={leaguePath(group.sport, group.league)}
              action={t("seeAll")}
            />
            <div className="home-sport-grid">
              {group.articles.map((article) => (
                <ArticleCard key={article.id} article={article} variant="row" />
              ))}
            </div>
          </section>
        ))}

        {favorites.sports.length === 0 && favorites.leagues.length === 0 && (
          <p className="favorites-hint">
            {t("favorites.hint")}{" "}
            <Link to="/my-sports">{t("nav.mySports")}</Link>
          </p>
        )}
      </PortalLayout>
    </div>
  );
}
