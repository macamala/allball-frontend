import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getArticle, getRelated, peekArticle, recordView } from "../api.js";
import { leaguePath, sportPath } from "../config/sports.js";
import { heroMedia, resolveBlocks } from "../lib/articleBlocks.js";
import { articleJsonLd, breadcrumbJsonLd, setPageSeo } from "../lib/seo.js";
import { competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { scrollToComments } from "../lib/scrollToComments.js";
import { useI18n } from "../context/I18nContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { ArticleBodySkeleton } from "../components/Skeleton.jsx";
import ArticleBody from "../components/article/ArticleBody.jsx";
import ArticleCommentBar from "../components/article/ArticleCommentBar.jsx";
import ArticleHeader from "../components/article/ArticleHeader.jsx";
import ArticleHero from "../components/article/ArticleHero.jsx";
import ArticlePager from "../components/article/ArticlePager.jsx";
import Comments from "../components/Comments.jsx";
import RelatedStories from "../components/article/RelatedStories.jsx";

function hasArticleBody(article) {
  return Array.isArray(article?.blocks) || typeof article?.content === "string";
}

function shellFrom(location, slug) {
  const cached = peekArticle(slug);
  if (cached) return cached;
  const preview = location.state?.preview;
  if (preview?.slug === slug) return preview;
  return null;
}

function mergeRelated(related, inlineArticle) {
  const rows = Array.isArray(related) ? [...related] : [];
  if (!inlineArticle?.id && !inlineArticle?.slug) return rows;
  const exists = rows.some(
    (row) =>
      (inlineArticle.id && row.id === inlineArticle.id) ||
      (inlineArticle.slug && row.slug === inlineArticle.slug)
  );
  if (exists) return rows;
  return [inlineArticle, ...rows];
}

function ArticleInner({ article, related, bodyPending }) {
  const [commentCount, setCommentCount] = useState(0);
  const hero = heroMedia(article);
  const blocks = bodyPending ? [] : resolveBlocks(article);
  const inlineRelated = blocks.find((block) => block?.type === "related")?.article;
  const relatedBottom = mergeRelated(related, inlineRelated);

  return (
    <div className="article-shell">
      <div className="article-layout">
        <div className="article-column">
          <ArticleHeader
            article={article}
            commentCount={commentCount}
            onComments={() => scrollToComments()}
          />
          <ArticleHero media={hero} article={article} />
          {bodyPending ? (
            <ArticleBodySkeleton />
          ) : (
            <ArticleBody blocks={blocks} title={article.title} />
          )}
          <Comments slug={article.slug} onCount={setCommentCount} />
          {!bodyPending && (
            <ArticlePager previous={article.previous} next={article.next} />
          )}
          <RelatedStories articles={relatedBottom} />
        </div>
      </div>
      <ArticleCommentBar commentCount={commentCount} />
    </div>
  );
}

export default function ArticlePage() {
  const { slug } = useParams();
  const location = useLocation();
  const { t } = useI18n();
  const initial = shellFrom(location, slug);
  const [article, setArticle] = useState(initial);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const shell = shellFrom(location, slug);
    if (shell) {
      setArticle(shell);
      setLoading(false);
    } else {
      setArticle(null);
      setLoading(true);
    }
    setError("");
    setRelated([]);

    getArticle(slug)
      .then((data) => {
        if (cancelled) return;
        setArticle(data);
        setLoading(false);
        recordView(data.slug);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!shell) setArticle(null);
        setError(err.status === 404 ? t("empty.articleMissing") : t("empty.loadFail"));
        setLoading(false);
      });

    getRelated(slug, 6)
      .then((rows) => {
        if (!cancelled) {
          setRelated(Array.isArray(rows) ? rows : []);
        }
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, t, location.state]);

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

  if (loading && !article) {
    return <p className="info-text">{t("loading.article")}</p>;
  }

  if ((error && !article) || !article) {
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

  const presentation = article.presentation_type || "standard";
  const heroKind = article.hero_media_kind;
  const mediaClass =
    heroKind === "CREST_OR_LOGO" || heroKind === "GRAPHIC"
      ? " is-crest-media"
      : !article.image_url
        ? " is-no-media"
        : "";

  return (
    <article className={`article-page is-${presentation}${mediaClass}`}>
      <ArticleInner
        article={article}
        related={related}
        bodyPending={!hasArticleBody(article)}
      />
    </article>
  );
}
