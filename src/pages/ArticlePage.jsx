import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { articlePath, getArticle, getJSON, getRelated, peekArticle, recordView } from "../api.js";
import { leaguePath, sportPath } from "../config/sports.js";
import { heroMedia } from "../lib/articleBlocks.js";
import { hasNewsArticleBody, isNewsArticleForSlug, newsArticleBlocks, newsArticleShell } from "../lib/newsArticleState.js";
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

export const NEWS_ARTICLE_TIMEOUT_MS = 15000;

function shellFrom(location, slug) {
  return newsArticleShell(peekArticle(slug), location.state?.preview, slug);
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

function ReaderNotice({ message, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="article-body" role="alert">
      <p className="info-text">{message}</p>
      <button type="button" className="btn" onClick={onRetry}>
        {t("live.retry")}
      </button>
    </div>
  );
}

function ArticleInner({ article, related, pending, error, onRetry }) {
  const { t } = useI18n();
  const [commentCount, setCommentCount] = useState(0);
  const hero = heroMedia(article);
  const blocks = newsArticleBlocks(article);
  const bodyAvailable = hasNewsArticleBody(blocks);
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
          {error && <ReaderNotice message={error} onRetry={onRetry} />}
          {bodyAvailable ? (
            <ArticleBody blocks={blocks} title={article.title} />
          ) : pending ? (
            <ArticleBodySkeleton />
          ) : !error ? (
            <ReaderNotice message={t("empty.loadFail")} onRetry={onRetry} />
          ) : null}
          <Comments slug={article.slug} onCount={setCommentCount} />
          {!pending && bodyAvailable && (
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
  const [result, setResult] = useState(() => ({
    slug, article: shellFrom(location, slug), pending: true, error: "",
  }));
  const [relatedResult, setRelatedResult] = useState({ slug, rows: [] });
  const [retry, setRetry] = useState({ slug, count: 0 });
  const viewed = useRef({ slug: null, recorded: false });
  const attempt = retry.slug === slug ? retry.count : 0;

  useEffect(() => {
    let active = true;
    let settled = false;
    const controller = new AbortController();
    const shell = shellFrom(location, slug);
    if (viewed.current.slug !== slug) viewed.current = { slug, recorded: false };
    setResult({ slug, article: shell, pending: true, error: "" });

    const fail = (err) => {
      if (!active || settled) return;
      settled = true;
      clearTimeout(timer);
      controller.abort();
      const missing = err?.status === 404;
      setResult({
        slug, article: missing ? null : shell, pending: false,
        error: missing ? "missing" : "load",
      });
    };
    const timer = setTimeout(() => fail({ status: 408 }), NEWS_ARTICLE_TIMEOUT_MS);

    // Normal navigation retains existing prefetch/cache behavior. Explicit retries
    // bypass only this article's cache/inflight request, never clearing score caches.
    Promise.resolve()
      .then(() => attempt
        ? getJSON(articlePath(slug), { signal: controller.signal })
        : getArticle(slug))
      .then((data) => {
        if (!active || settled) return;
        if (!isNewsArticleForSlug(data, slug)) throw new Error("Invalid article identity");
        settled = true;
        clearTimeout(timer);
        setResult({ slug, article: data, pending: false, error: "" });
        if (hasNewsArticleBody(newsArticleBlocks(data)) && !viewed.current.recorded) {
          viewed.current.recorded = true;
          recordView(data.slug);
        }
      })
      .catch(fail);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
    // A same-URL preview or UI-language change must not restart the network read.
    // The preview is captured for this route/attempt, not treated as live authority.
  }, [slug, attempt]);

  useEffect(() => {
    let active = true;
    setRelatedResult({ slug, rows: [] });
    getRelated(slug, 6)
      .then((rows) => {
        if (active) setRelatedResult({ slug, rows: Array.isArray(rows) ? rows : [] });
      })
      .catch(() => {
        if (active) setRelatedResult({ slug, rows: [] });
      });
    return () => { active = false; };
  }, [slug]);

  // Route identity is checked during render, before an effect can clear old state.
  const current = result.slug === slug
    ? result
    : { slug, article: shellFrom(location, slug), pending: true, error: "" };
  const article = current.article;
  const related = relatedResult.slug === slug ? relatedResult.rows : [];
  const error = current.error
    ? t(current.error === "missing" ? "empty.articleMissing" : "empty.loadFail")
    : "";
  const onRetry = () => setRetry((previous) => ({
    slug, count: previous.slug === slug ? previous.count + 1 : 1,
  }));

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

  if (current.pending && !article) {
    return <p className="info-text" role="status">{t("loading.article")}</p>;
  }

  if (!article) {
    return (
      <EmptyState
        compact
        title={error || t("empty.articleMissing")}
        action={
          <>
            {current.error !== "missing" && (
              <button type="button" className="btn" onClick={onRetry}>{t("live.retry")}</button>
            )}
            <Link to="/" className="btn">{t("empty.backHome")}</Link>
          </>
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
        key={slug}
        article={article}
        related={related}
        pending={current.pending}
        error={error}
        onRetry={onRetry}
      />
    </article>
  );
}
