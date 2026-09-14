import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArticle, getRelated, getScores, recordView } from "../api.js";
import { leaguePath, sportPath } from "../config/sports.js";
import { heroMedia, resolveBlocks } from "../lib/articleBlocks.js";
import { articleJsonLd, breadcrumbJsonLd, setPageSeo } from "../lib/seo.js";
import { competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ArticleBody from "../components/article/ArticleBody.jsx";
import ArticleHeader from "../components/article/ArticleHeader.jsx";
import ArticleHero from "../components/article/ArticleHero.jsx";
import ArticleShare from "../components/article/ArticleShare.jsx";
import Comments from "../components/Comments.jsx";
import LiveScoresRail, { hasLiveUtilityData } from "../components/LiveScoresRail.jsx";
import PortalLayout from "../components/PortalLayout.jsx";
import RelatedStories from "../components/article/RelatedStories.jsx";
import SaveButton from "../components/SaveButton.jsx";

export default function ArticlePage() {
  const { slug } = useParams();
  const { t } = useI18n();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
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
        const extras = await Promise.allSettled([getRelated(data.slug, 6), getScores()]);
        if (cancelled) return;
        const [relatedData, scoresData] = extras;
        setRelated(
          relatedData.status === "fulfilled" && Array.isArray(relatedData.value)
            ? relatedData.value
            : []
        );
        setScores(scoresData.status === "fulfilled" ? scoresData.value : null);
      })
      .catch((err) => {
        if (cancelled) return;
        setArticle(null);
        setError(err.status === 404 ? t("empty.articleMissing") : t("empty.loadFail"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  useEffect(() => {
    if (!article) {
      setPageSeo({
        title: error ? `${t("empty.articleMissing")} | NinkoSports` : "NinkoSports",
        description: "NinkoSports article.",
        path: `/article/${slug}`,
      });
      return undefined;
    }
    const path = `/article/${article.slug}`;
    const sportName = sportI18nKey(article.sport) ? t(sportI18nKey(article.sport)) : "";
    const crumbs = [
      { name: t("nav.home"), path: "/" },
      article.sport ? { name: sportName, path: sportPath(article.sport) } : null,
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
  }, [article, error, slug, t]);

  if (loading) {
    return <p className="info-text">{t("loading.article")}</p>;
  }

  if (error || !article) {
    return (
      <EmptyState
        compact
        title={error || t("empty.articleMissing")}
        action={
          <Link to="/" className="btn">
            {t("empty.backHome")}
          </Link>
        }
      />
    );
  }

  const hero = heroMedia(article);
  const blocks = resolveBlocks(article);
  const presentation = article.presentation_type || "standard";
  const liveRail = hasLiveUtilityData(scores) ? <LiveScoresRail scores={scores} /> : null;

  return (
    <article className={`article-page is-${presentation}`}>
      <PortalLayout right={liveRail}>
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
                  {t("previous")}: {article.previous.title}
                </Link>
              )}
              {article.next && (
                <Link to={`/article/${article.next.slug}`}>
                  {t("next")}: {article.next.title}
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
