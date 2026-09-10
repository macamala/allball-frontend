import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPortalHome } from "../api.js";
import { MAIN_SPORTS, leaguePath, sportPath } from "../config/sports.js";
import { readFavorites } from "../lib/favorites.js";
import { setPageSeo, websiteJsonLd } from "../lib/seo.js";
import { sportLabel } from "../labels.js";
import ArticleCard from "../components/ArticleCard.jsx";
import BreakingBar from "../components/BreakingBar.jsx";
import EmptyState from "../components/EmptyState.jsx";
import HeroStories from "../components/HeroStories.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { HeroSkeleton, CardSkeleton } from "../components/Skeleton.jsx";

export default function HomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const favorites = useMemo(() => readFavorites(), []);

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

  return (
    <div className="page-home">
      <BreakingBar articles={breaking} />
      {featured.length > 0 ? (
        <HeroStories articles={featured} />
      ) : (
        <EmptyState
          title="No stories yet"
          body="New NinkoSports coverage will appear here as soon as it is published."
        />
      )}

      {latest.length > 0 && (
        <section className="section">
          <SectionHeader title="Latest news" />
          <div className="news-list">
            {latest.slice(0, 12).map((article) => (
              <ArticleCard key={article.id} article={article} variant="row" />
            ))}
          </div>
        </section>
      )}

      {mostRead.length > 0 && (
        <section className="section">
          <SectionHeader title="Most read" />
          <div className="card-grid">
            {mostRead.map((article) => (
              <ArticleCard key={article.id} article={article} variant="compact" />
            ))}
          </div>
        </section>
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
            <div className="card-grid">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
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
          <div className="card-grid">
            {group.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ))}

      {favorites.sports.length === 0 && favorites.leagues.length === 0 && (
        <p className="favorites-hint">
          Follow sports and leagues in <Link to="/my-sports">My Sports</Link> to
          personalize this homepage later.
        </p>
      )}
    </div>
  );
}
