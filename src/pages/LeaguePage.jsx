import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getArticles, peekArticles } from "../api.js";
import { featuredLeagueKeys, getSport, resolveLeague, scopedCompetitionId } from "../config/sports.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { breadcrumbJsonLd, setPageSeo } from "../lib/seo.js";
import LatestFeed from "../components/LatestFeed.jsx";
import Breadcrumbs from "../components/Breadcrumbs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import HeroStories from "../components/HeroStories.jsx";
import LeagueTabs from "../components/LeagueTabs.jsx";
import ProviderPending from "../components/ProviderPending.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";
import StandingsTable from "../components/StandingsTable.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import { sportI18nKey } from "../i18n/index.js";
import { isPremiumArticle, premiumFirst } from "../lib/quality.js";

export default function LeaguePage() {
  const { sportSlug, leagueSlug } = useParams();
  const sport = getSport(sportSlug);
  const league = resolveLeague(sportSlug, leagueSlug);
  const [tab, setTab] = useState("news");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { favorites, syncFavorites } = useAuth();
  const { t } = useI18n();
  const sportLabelText = sport ? t(sportI18nKey(sport.slug) || "sport.label") : t("sport.label");
  const tabs = [
    { id: "news", label: t("league.news") },
    { id: "fixtures", label: t("league.fixtures") },
    { id: "results", label: t("league.results") },
    { id: "standings", label: t("league.standings") },
  ];

  const followKey = league.catchAll
    ? scopedCompetitionId(sportSlug, "other")
    : scopedCompetitionId(sportSlug, league.league);
  const followed =
    Boolean(followKey) &&
    (favorites.leagues || []).some(
      (item) => item === followKey || item === league.league
    );

  useEffect(() => {
    setTab("news");
  }, [followKey]);

  useEffect(() => {
    const path = `/${sportSlug}/${leagueSlug}`;
    const crumbs = [
      { name: t("nav.home"), path: "/" },
      { name: sportLabelText, path: sport?.path || `/${sportSlug}` },
      { name: league.label, path },
    ];
    setPageSeo({
      title: `${league.label} news | NinkoSports`,
      description: `Latest ${league.label} news from NinkoSports.`,
      path,
      jsonLd: breadcrumbJsonLd(crumbs),
    });
  }, [league.label, leagueSlug, sport, sportSlug, sportLabelText, t]);

  useEffect(() => {
    let cancelled = false;
    const params = { sport: sportSlug, limit: 80 };
    if (league.catchAll) {
      params.exclude_leagues = featuredLeagueKeys(sportSlug).join(",");
    } else if (league.league) {
      params.league = league.league;
    }
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
        if (!cancelled) setError(t("empty.competitionFail"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [league.catchAll, league.league, sportSlug]);

  if (!sport) return <NotFoundPage />;

  const isolated = articles.filter(isPremiumArticle);
  const { premium, rest } = premiumFirst(isolated);

  return (
    <div className="page-league">
      <Breadcrumbs
        items={[
          { name: t("nav.home"), path: "/" },
          { name: sportLabelText, path: sport?.path || `/${sportSlug}` },
          { name: league.label },
        ]}
      />
      <div className="page-heading">
        <div>
          <p className="section-eyebrow">{sportLabelText}</p>
          <h1>{league.label}</h1>
        </div>
        {followKey && (
          <button
            type="button"
            className={followed ? "btn btn-ghost is-on" : "btn btn-ghost"}
            onClick={() => {
              const leagues = followed
                ? (favorites.leagues || []).filter((item) => item !== followKey)
                : [...(favorites.leagues || []), followKey];
              syncFavorites({ ...favorites, leagues });
            }}
          >
            {followed ? t("following") : t("follow")}
          </button>
        )}
      </div>

      <LeagueTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "news" && (
        <>
          {loading && <CardSkeleton count={6} />}
          {error && <EmptyState title={error} />}
          {!loading && !error && isolated.length === 0 && (
            <EmptyState
              compact
              title={t("empty.competitionNone", { competition: league.label })}
              body={t("empty.competitionNoneBody")}
            />
          )}
          {!loading && isolated.length > 0 && (
            <>
              <HeroStories articles={premium.slice(0, 4)} />
              <LatestFeed articles={[...premium.slice(4), ...rest]} />
            </>
          )}
        </>
      )}

      {tab === "fixtures" && (
        <ProviderPending title={t("provider.fixtures")} />
      )}
      {tab === "results" && (
        <ProviderPending title={t("provider.results")} />
      )}
      {tab === "standings" && (
        <StandingsTable
          sport={sportSlug}
          rows={[]}
          empty={
            <ProviderPending title={t("provider.standings")} />
          }
        />
      )}
    </div>
  );
}
