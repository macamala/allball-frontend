import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function ArticlePage({ apiBase }) {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`${apiBase}/articles/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Article not found");
        return res.json();
      })
      .then((data) => {
        setArticle(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Article not found or error loading article.");
        setLoading(false);
      });
  }, [slug, apiBase]);

  if (loading) return <div className="info-text">Loading article...</div>;
  if (error) return <div className="error-text">{error}</div>;
  if (!article) return <div className="info-text">No article.</div>;

  return (
    <div className="page-root article-page">
      <header className="header">
        <Link to="/" className="back-link">
          ← Back to news
        </Link>
        <h1>{article.title}</h1>
        <p className="meta-line">
          {article.sport && <span>{article.sport.toUpperCase()}</span>}
          {article.league && <span> · {article.league}</span>}
          {article.country && <span> · {article.country}</span>}
          {article.created_at && (
            <span>
              {" "}
              · {new Date(article.created_at).toLocaleString()}
            </span>
          )}
        </p>
      </header>

      {article.image_url && (
        <img
          src={article.image_url}
          alt={article.title}
          className="article-hero-image"
        />
      )}

      <main className="article-content">
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {article.content}
        </p>
      </main>

      {article.source_url && (
        <footer className="article-footer">
          <small>
            Source:{" "}
            <a href={article.source_url} target="_blank" rel="noreferrer">
              original article
            </a>
          </small>
        </footer>
      )}
    </div>
  );
}

export default ArticlePage;
