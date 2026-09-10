import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getArticles } from "../api.js";
import { featuredLeagueKeys, getSport, resolveLeague } from "../config/sports.js";
import { isFollowed, toggleFavorite } from "../lib/favorites.js";
import { breadcrumbJsonLd, setPageSeo } from "../lib/seo.js";
import ArticleCard from "../components/ArticleCard.jsx";
import Breadcrumbs from "../components/Breadcrumbs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LeagueTabs from "../components/LeagueTabs.jsx";
import ProviderPending from "../components/ProviderPending.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import StandingsTable from "../components/StandingsTable.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import { premiumFirst } from "../lib/quality.js";

const TABS = [
  { id: "news", label: "News" },
  { id: "fixtures", label: "Fixtures" },
  { id: "results", label: "Results" },
  { id: "standings", label: "Standings" },
];

export default function LeaguePage() {
  const { sportSlug, leagueSlug } = useParams();
  const sport = getSport(sportSlug);
  const league = resolveLeague(sportSlug, leagueSlug);
  const [tab, setTab] = useState("news");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followed, setFollowed] = useState(false);

  const followKey = league.catchAll ? `${sportSlug}:other` : league.league;

  useEffect(() => {
    setFollowed(Boolean(followKey) && isFollowed("leagues", followKey));
    setTab("news");
  }, [followKey]);

  useEffect(() => {
    const path = `/${sportSlug}/${leagueSlug}`;
    const crumbs = [
      { name: "Home", path: "/" },
      { name: sport?.label || "Sport", path: sport?.path || `/${sportSlug}` },
      { name: league.label, path },
    ];
    setPageSeo({
      title: `${league.label} news | NinkoSports`,
      description: `Latest ${league.label} news from NinkoSports.`,
      path,
      jsonLd: breadcrumbJsonLd(crumbs),
    });
  }, [league.label, leagueSlug, sport, sportSlug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { sport: sportSlug, limit: 80 };
    if (league.catchAll) {
      params.exclude_leagues = featuredLeagueKeys(sportSlug).join(",");
    } else if (league.league) {
      params.league = league.league;
    }
    getArticles(params)
      .then((rows) => {
        if (!cancelled) {
          setArticles(Array.isArray(rows) ? rows : []);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load this competition.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [league.catchAll, league.league, sportSlug]);

  if (!sport) return <NotFoundPage />;

  const { premium, rest } = premiumFirst(articles);

  return (
    <div className="page-league">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: sport?.label || "Sport", path: sport?.path || `/${sportSlug}` },
          { name: league.label },
        ]}
      />
      <div className="page-heading">
        <div>
          <p className="section-eyebrow">{sport?.label}</p>
          <h1>{league.label}</h1>
        </div>
        {followKey && (
          <button
            type="button"
            className={followed ? "btn btn-ghost is-on" : "btn btn-ghost"}
            onClick={() => {
              const next = toggleFavorite("leagues", followKey);
              setFollowed(next.leagues.includes(followKey));
            }}
          >
            {followed ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <LeagueTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "news" && (
        <>
          {loading && <CardSkeleton count={6} />}
          {error && <EmptyState title={error} />}
          {!loading && !error && articles.length === 0 && (
            <EmptyState
              title={`No ${league.label} stories yet`}
              body="This competition page will fill when NinkoSports has coverage."
            />
          )}
          {!loading && articles.length > 0 && (
            <div className="card-grid">
              {[...premium, ...rest].map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "fixtures" && (
        <ProviderPending title="Fixtures coming when live data is connected" />
      )}
      {tab === "results" && (
        <ProviderPending title="Results coming when live data is connected" />
      )}
      {tab === "standings" && (
        <StandingsTable
          sport={sportSlug}
          rows={[]}
          empty={
            <ProviderPending title="Standings coming when live data is connected" />
          }
        />
      )}
    </div>
  );
}
