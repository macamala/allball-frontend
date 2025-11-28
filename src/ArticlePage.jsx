import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ArticleCard from "./ArticleCard.jsx";

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

      try {
        const res = await fetch(`${apiBase}/articles/${slug}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setArticle(data || null);

        // nakon što dobijemo članak, povlačimo related
        if (data) {
          fetchRelated(data);
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("Failed to load article.");
      } finally {
        setLoading(false);
      }
    };

    const fetchRelated = async (mainArticle) => {
      try {
        const params = new URLSearchParams();
        if (mainArticle.sport) params.append("sport", mainArticle.sport);
        if (mainArticle.league) params.append("league", mainArticle.league);
        params.append("limit", "6");

        const url = `${apiBase}/articles?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        if (!Array.isArray(data)) return;

        // izbacujemo trenutni članak i uzimamo 3 random / prva
        const filtered = data.filter((a) => a.id !== mainArticle.id);
        setRelated(filtered.slice(0, 3));
      } catch (err) {
        console.error("Error fetching related:", err);
      }
    };

    fetchArticle();
  }, [apiBase, slug]);

  if (loading) {
    return (
      <div className="article-page-root">
        <div className="article-container">
          <p className="info-text">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="article-page-root">
        <div className="article-container">
          <p className="error-text">{error || "Article not found."}</p>
          <Link to="/" className="article-back-link">
            ← Back to NinkoSports feed
          </Link>
        </div>
      </div>
    );
  }

  const displayText =
    article.ai_content ||
    article.content ||
    article.description ||
    "";

  // jednostavno parsiranje paragrafova
  const paragraphs = displayText
    ? displayText.split(/\n+/).filter((p) => p.trim().length > 0)
    : [];

  // formatiranje datuma
  let formattedDate = "";
  if (article.published_at) {
    const d = new Date(article.published_at);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return (
    <div className="article-page-root">
      <div className="article-container">
        <Link to="/" className="article-back-link">
          ← Back to NinkoSports
        </Link>

        {article.image && (
          <div className="article-hero">
            <img
              src={article.image}
              alt={article.title}
              className="article-hero-image"
            />
          </div>
        )}

        <h1 className="article-page-title">{article.title}</h1>

        <div className="article-meta-row">
          {article.sport && (
            <span className="article-meta-chip">{article.sport}</span>
          )}
          {article.league && (
            <span className="article-meta-chip secondary">
              {article.league}
            </span>
          )}
          {article.country && (
            <span className="article-meta-chip country-chip">
              {article.country}
            </span>
          )}
          {formattedDate && (
            <span className="article-meta-date">{formattedDate}</span>
          )}
        </div>

        <div className="article-full-body">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, idx) => (
              <p key={idx} className="article-full-paragraph">
                {p}
              </p>
            ))
          ) : (
            <p className="article-full-paragraph">
              {article.description || "No content available."}
            </p>
          )}
        </div>

        {article.url && (
          <a
            href={article.url}
            className="article-source-link"
            target="_blank"
            rel="noreferrer"
          >
            Read original source ↗
          </a>
        )}

        {related.length > 0 && (
          <section className="related-section">
            <h2 className="related-title">More from this league</h2>
            <div className="related-grid">
              {related.map((rel) => (
                <ArticleCard key={rel.id} article={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ArticlePage;
