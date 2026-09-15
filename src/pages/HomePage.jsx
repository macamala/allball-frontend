import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPortalHome, peekPortalHome } from "../api.js";
import { MAIN_SPORTS, leaguePath, sportPath } from "../config/sports.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { sportI18nKey } from "../i18n/index.js";
import { composeHomeModules } from "../lib/editorial.js";
import { setPageSeo, websiteJsonLd } from "../lib/seo.js";
import BreakingBar from "../components/BreakingBar.jsx";
import EmptyState from "../components/EmptyState.jsx";
import HeroStories from "../components/HeroStories.jsx";
import LatestFeed from "../components/LatestFeed.jsx";
import LiveScoresRail, { hasLiveUtilityData } from "../components/LiveScoresRail.jsx";
import MostReadList from "../components/MostReadList.jsx";
import PortalLayout from "../components/PortalLayout.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import SportDesk from "../components/SportDesk.jsx";
import { HeroSkeleton, CardSkeleton } from "../components/Skeleton.jsx";

export default function HomePage() {
  const cached = peekPortalHome();
  const [data, setData] = useState(cached);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!cached);
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
    const cachedHome = peekPortalHome();
    if (cachedHome) {
      setData(cachedHome);
      setLoading(false);
    } else {
      setLoading(true);
    }
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

  const modules = composeHomeModules(data || {});
  const scores = data?.sports_data;
  const liveRail = hasLiveUtilityData(scores) ? <LiveScoresRail scores={scores} /> : null;

  return (
    <div className="page-home">
      <BreakingBar articles={modules.breaking} />
      <PortalLayout right={liveRail}>
        {modules.featured.length > 0 ? (
          <section className="section top-stories" aria-labelledby="top-stories-heading">
            <SectionHeader
              id="top-stories-heading"
              eyebrow={t("section.topStories")}
              title={t("topStories")}
            />
            <HeroStories articles={modules.featured} />
          </section>
        ) : (
          <EmptyState
            compact
            title={t("empty.noStories")}
            body={t("empty.noStoriesBody")}
          />
        )}

        <div className="editorial-split">
          {modules.latest.length > 0 && (
            <section className="section latest-desk">
              <SectionHeader eyebrow={t("section.newsroom")} title={t("latest")} />
              <LatestFeed articles={modules.latest.slice(0, 8)} />
            </section>
          )}
          {modules.mostRead.length > 0 && (
            <section className="section most-read-desk">
              <SectionHeader title={t("mostRead")} />
              <MostReadList articles={modules.mostRead.slice(0, 5)} />
            </section>
          )}
        </div>

        {sportOrder.map((slug) => {
          const articles = modules.bySport[slug] || [];
          if (!articles.length) return null;
          const key = sportI18nKey(slug);
          return (
            <section className="section sport-section" key={slug}>
              <SectionHeader
                eyebrow={t("section.sport")}
                title={key ? t(key) : slug}
                to={sportPath(slug)}
                action={t("seeAll")}
              />
              <SportDesk articles={articles.slice(0, 4)} />
            </section>
          );
        })}

        {modules.byLeague.map((group) => (
          <section className="section competition-section" key={group.league}>
            <SectionHeader
              eyebrow={t("section.competition")}
              title={group.label}
              to={leaguePath(group.sport, group.league)}
              action={t("seeAll")}
            />
            <SportDesk articles={group.articles} />
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
