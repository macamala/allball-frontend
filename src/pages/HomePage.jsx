import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPortalHome } from "../api.js";
import { MAIN_SPORTS, leaguePath, sportPath } from "../config/sports.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo, websiteJsonLd } from "../lib/seo.js";
import { sportLabel } from "../labels.js";
import ArticleCard from "../components/ArticleCard.jsx";
import BreakingBar from "../components/BreakingBar.jsx";
import EmptyState from "../components/EmptyState.jsx";
import HeroStories from "../components/HeroStories.jsx";
import LiveScoresRail from "../components/LiveScoresRail.jsx";
import MySportsRail from "../components/MySportsRail.jsx";
import PortalLayout from "../components/PortalLayout.jsx";
import RailModule from "../components/RailModule.jsx";
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
      title: "NinkoSports | Global sports news",
      description:
        "NinkoSports — original English sports news covering football, basketball, tennis and motorsport.",
      path: "/",
      jsonLd: websiteJsonLd(),
    });
  }, []);

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
        if (!cancelled) setError("Failed to load the latest stories.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    return <EmptyState title="Unable to load news" body={error} />;
  }

  const featured = data?.featured || [];
  const latest = data?.latest || [];
  const breaking = data?.breaking || [];
  const mostRead = data?.most_read || [];
  const bySport = data?.by_sport || {};
  const byLeague = data?.by_league || [];
  const scores = data?.sports_data;

  return (
    <div className="page-home">
      <BreakingBar articles={breaking} />
      <PortalLayout
        left={
          <>
            <RailModule title={t("latest")} articles={latest} />
            <MySportsRail />
          </>
        }
        right={
          <>
            <RailModule title={t("mostRead")} articles={mostRead} ordered />
            <LiveScoresRail scores={scores} />
          </>
        }
      >
        {featured.length > 0 ? (
          <HeroStories articles={featured} />
        ) : (
          <EmptyState
            title="No stories yet"
            body="New NinkoSports coverage will appear here as soon as it is published."
          />
        )}

        {sportOrder.map((slug) => {
          const articles = bySport[slug] || [];
          if (!articles.length) return null;
          return (
            <section className="section" key={slug}>
              <SectionHeader
                eyebrow="Sport"
                title={sportLabel(slug)}
                to={sportPath(slug)}
              />
              <div className="sport-story-list">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="row" />
                ))}
              </div>
            </section>
          );
        })}

        {byLeague.map((group) => (
          <section className="section" key={group.league}>
            <SectionHeader
              eyebrow="Competition"
              title={group.label}
              to={leaguePath(group.sport, group.league)}
            />
            <div className="sport-story-list">
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
