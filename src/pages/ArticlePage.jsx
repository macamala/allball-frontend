import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArticle, getRelated, recordView } from "../api.js";
import { leaguePath, sportPath } from "../config/sports.js";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  setPageSeo,
} from "../lib/seo.js";
import {
  articleDate,
  competitionLabel,
  sportLabel,
} from "../labels.js";
import ArticleCard from "../components/ArticleCard.jsx";
import ArticleImage from "../components/ArticleImage.jsx";
import Breadcrumbs from "../components/Breadcrumbs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ShareButtons from "../components/ShareButtons.jsx";

export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
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
        try {
          const relatedData = await getRelated(data.slug, 6);
          if (!cancelled) setRelated(Array.isArray(relatedData) ? relatedData : []);
        } catch (err) {
          if (!cancelled) setRelated([]);
        }
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

  const paragraphs = (article.content || "")
    .split(/\n+/)
    .filter((p) => p.trim().length > 0);
  const sport = sportLabel(article.sport, article.sport_label);
  const league = competitionLabel(article.league, article.league_label);
  const crumbs = [
    { name: "Home", path: "/" },
    article.sport ? { name: sport, path: sportPath(article.sport) } : null,
    article.league
      ? { name: league, path: leaguePath(article.sport, article.league) }
      : null,
    { name: article.title },
  ].filter(Boolean);

  return (
    <article className="article-page">
      <Breadcrumbs items={crumbs} />
      <div className="pill-row">
        {sport && <span className="pill">{sport}</span>}
        {league && <span className="pill pill-league">{league}</span>}
        {article.is_breaking && <span className="pill pill-breaking">Breaking</span>}
      </div>
      <h1 className="article-headline">{article.title}</h1>
      <div className="article-byline">
        {articleDate(article) && (
          <time dateTime={article.published_at || article.created_at}>
            {articleDate(article)}
          </time>
        )}
        {article.reading_time_minutes && (
          <span>{article.reading_time_minutes} min read</span>
        )}
      </div>
      <ArticleImage
        src={article.image_url}
        alt={article.image_url ? article.title : ""}
        wrapperClassName="article-hero-media"
        eager
      />
      <div className="article-body">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
        ) : (
          <p>{article.summary || "This NinkoSports story is being updated."}</p>
        )}
      </div>
      <ShareButtons title={article.title} path={`/article/${article.slug}`} />
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
      {related.length > 0 && (
        <section className="section">
          <h2 className="section-title">Related stories</h2>
          <div className="card-grid">
            {related.map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
