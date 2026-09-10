import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getArticle,
  getMostRead,
  getRecentArticles,
  getRelated,
  getScores,
  recordView,
} from "../api.js";
import { leaguePath, sportPath } from "../config/sports.js";
import { heroMedia, resolveBlocks } from "../lib/articleBlocks.js";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  setPageSeo,
} from "../lib/seo.js";
import {
  competitionLabel,
  sportLabel,
} from "../labels.js";
import EmptyState from "../components/EmptyState.jsx";
import ArticleBody from "../components/article/ArticleBody.jsx";
import ArticleHeader from "../components/article/ArticleHeader.jsx";
import ArticleHero from "../components/article/ArticleHero.jsx";
import ArticleShare from "../components/article/ArticleShare.jsx";
import Comments from "../components/Comments.jsx";
import LiveScoresRail from "../components/LiveScoresRail.jsx";
import PortalLayout from "../components/PortalLayout.jsx";
import RailModule from "../components/RailModule.jsx";
import RelatedStories from "../components/article/RelatedStories.jsx";
import SaveButton from "../components/SaveButton.jsx";

export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [latest, setLatest] = useState([]);
  const [mostRead, setMostRead] = useState([]);
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setRelated([]);
    getArticle(slug)
      .then(async (data) => {
        if (cancelled) return;
        setArticle(data);
        recordView(data.slug);
        const extras = await Promise.allSettled([
          getRelated(data.slug, 6),
          getRecentArticles(10),
          getMostRead(8),
          getScores(),
        ]);
        if (cancelled) return;
        const [relatedData, latestData, mostReadData, scoresData] = extras;
        setRelated(
          relatedData.status === "fulfilled" && Array.isArray(relatedData.value)
            ? relatedData.value
            : []
        );
        setLatest(
          latestData.status === "fulfilled" && Array.isArray(latestData.value)
            ? latestData.value
            : []
        );
        setMostRead(
          mostReadData.status === "fulfilled" && Array.isArray(mostReadData.value)
            ? mostReadData.value
            : []
        );
        setScores(scoresData.status === "fulfilled" ? scoresData.value : null);
      })
      .catch((err) => {
        if (cancelled) return;
        setArticle(null);
        setError(err.status === 404 ? "Article not found." : "Failed to load article.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!article) {
      setPageSeo({
        title: error ? "Article not found | NinkoSports" : "NinkoSports",
        description: "NinkoSports article.",
        path: `/article/${slug}`,
      });
      return undefined;
    }
    const path = `/article/${article.slug}`;
    const crumbs = [
      { name: "Home", path: "/" },
      article.sport
        ? { name: sportLabel(article.sport, article.sport_label), path: sportPath(article.sport) }
        : null,
      article.league
        ? {
            name: competitionLabel(article.league, article.league_label),
            path: leaguePath(article.sport, article.league),
          }
        : null,
      { name: article.title, path },
    ].filter(Boolean);
    setPageSeo({
      title: `${article.title} | NinkoSports`,
      description: article.summary || article.title,
      path,
      type: "article",
      image: article.image_url,
      jsonLd: [articleJsonLd(article, path), breadcrumbJsonLd(crumbs)],
    });
    return undefined;
  }, [article, error, slug]);

  if (loading) {
    return <p className="info-text">Loading article...</p>;
  }

  if (error || !article) {
    return (
      <EmptyState
        title={error || "Article not found."}
        action={
          <Link to="/" className="btn">
            Back to home
          </Link>
        }
      />
    );
  }

  const hero = heroMedia(article);
  const blocks = resolveBlocks(article);
  const presentation = article.presentation_type || "standard";
  const leagueRelated = related.filter((item) => item.league && item.league === article.league);

  return (
    <article className={`article-page is-${presentation}`}>
      <PortalLayout
        left={
          <>
            <RailModule title="Latest news" articles={latest} currentSlug={article.slug} />
            <RailModule title="Related" articles={leagueRelated} currentSlug={article.slug} />
          </>
        }
        right={
          <>
            <RailModule title="Most read" articles={mostRead} currentSlug={article.slug} ordered />
            <LiveScoresRail scores={scores} />
          </>
        }
      >
        <ArticleHeader article={article} />
        <div className="article-toolbar">
          <SaveButton article={article} />
        </div>
        <ArticleHero media={hero} />
        <div className="article-layout">
          <div className="article-column">
            <ArticleBody blocks={blocks} title={article.title} />
            <ArticleShare title={article.title} path={`/article/${article.slug}`} />
            <div className="article-pager">
              {article.previous && (
                <Link to={`/article/${article.previous.slug}`}>
                  Previous: {article.previous.title}
                </Link>
              )}
              {article.next && (
                <Link to={`/article/${article.next.slug}`}>
                  Next: {article.next.title}
                </Link>
              )}
            </div>
            <RelatedStories articles={related} />
            <Comments slug={article.slug} />
          </div>
        </div>
      </PortalLayout>
    </article>
  );
}
