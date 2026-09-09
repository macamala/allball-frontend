import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ArticleCard from "./ArticleCard.jsx";
import SiteHeader from "./SiteHeader.jsx";
import {
  articleDate,
  CANONICAL_SITE,
  competitionLabel,
  countryLabel,
  sportLabel,
} from "./labels.js";

function setMeta(attrName, attrValue, content) {
  if (!content) return;
  const selector = `meta[${attrName}="${attrValue}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function ArticlePage({ apiBase }) {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError("");
      setRelated([]);

      try {
        const res = await fetch(`${apiBase}/articles/${slug}`);
        if (res.status === 404) {
          setArticle(null);
          setError("Article not found.");
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setArticle(data || null);

        if (data?.slug) {
          try {
            const relatedRes = await fetch(
              `${apiBase}/articles/${encodeURIComponent(data.slug)}/related?limit=6`
            );
            if (relatedRes.ok) {
              const relatedData = await relatedRes.json();
              setRelated(Array.isArray(relatedData) ? relatedData.slice(0, 3) : []);
            }
          } catch (relatedErr) {
            console.error("Error fetching related:", relatedErr);
          }
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("Failed to load article.");
        setArticle(null);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [apiBase, slug]);

  useEffect(() => {
    if (!article) {
      document.title = error ? "Article not found | NinkoSports" : "NinkoSports";
      return undefined;
    }

    const canonical = `${CANONICAL_SITE}/article/${article.slug}`;
    document.title = `${article.title} | NinkoSports`;
    setMeta("name", "description", article.summary || article.title);
    setMeta("property", "og:title", article.title);
    setMeta("property", "og:description", article.summary || article.title);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:type", "article");
    if (article.image_url) {
      setMeta("property", "og:image", article.image_url);
    }
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", article.title);

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);

    const existing = document.getElementById("ninko-jsonld");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "ninko-jsonld";
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      datePublished: article.published_at || article.created_at,
      dateModified: article.published_at || article.created_at,
      image: article.image_url ? [article.image_url] : undefined,
      publisher: {
        "@type": "Organization",
        name: "NinkoSports",
        url: CANONICAL_SITE,
      },
      mainEntityOfPage: canonical,
      description: article.summary || article.title,
    });
    document.head.appendChild(script);

    return () => {
      const jsonld = document.getElementById("ninko-jsonld");
      if (jsonld) jsonld.remove();
    };
  }, [article, error]);

  if (loading) {
    return (
      <div className="article-page-root">
        <SiteHeader />
        <div className="article-container">
          <p className="info-text">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="article-page-root">
        <SiteHeader />
        <div className="article-container">
          <p className="error-text">{error || "Article not found."}</p>
          <Link to="/" className="article-back-link">
            ← Back to News
          </Link>
        </div>
      </div>
    );
  }

  const displayText = article.content || "";
  const paragraphs = displayText
    ? displayText.split(/\n+/).filter((p) => p.trim().length > 0)
    : [];
  const formattedDate = articleDate(article);
  const sport = sportLabel(article.sport, article.sport_label);
  const league = competitionLabel(article.league, article.league_label);
  const country = countryLabel(article.country, article.country_label);

  return (
    <div className="article-page-root">
      <SiteHeader />
      <article className="article-container">
        <Link to="/" className="article-back-link">
          ← Back to News
        </Link>

        <div className="article-meta-row">
          {sport && <span className="article-meta-chip">{sport}</span>}
          {league && (
            <span className="article-meta-chip secondary">{league}</span>
          )}
          {country && (
            <span className="article-meta-chip country-chip">{country}</span>
          )}
          {formattedDate && (
            <time className="article-meta-date" dateTime={article.published_at || article.created_at}>
              {formattedDate}
            </time>
          )}
        </div>

        <h1 className="article-page-title">{article.title}</h1>

        {article.image_url ? (
          <div className="article-hero">
            <img
              src={article.image_url}
              alt={article.title}
              className="article-hero-image"
            />
          </div>
        ) : (
          <div className="article-hero article-hero-empty" aria-hidden="true" />
        )}

        <div className="article-full-body">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, idx) => (
              <p key={idx} className="article-full-paragraph">
                {p}
              </p>
            ))
          ) : (
            <p className="article-full-paragraph">
              {article.summary || "This NinkoSports story is being updated."}
            </p>
          )}
        </div>

        {related.length > 0 && (
          <section className="related-section">
            <h2 className="related-title">Related NinkoSports stories</h2>
            <div className="related-grid">
              {related.map((rel) => (
                <ArticleCard key={rel.id} article={rel} />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

export default ArticlePage;
