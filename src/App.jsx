import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import ArticleCard from "./ArticleCard.jsx";
import FilterBar from "./FilterBar.jsx";
import ArticlePage from "./ArticlePage.jsx";
import logo from "./assets/logo-ninkosports.png";
import { CANONICAL_SITE } from "./labels.js";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const DEFAULT_LIMIT = 50;

function HomePage() {
  const [articles, setArticles] = useState([]);
  const [sports, setSports] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sport, setSport] = useState("");
  const [league, setLeague] = useState("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    document.title = "NinkoSports | Sports news in English";
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", `${CANONICAL_SITE}/`);
  }, []);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [sportsRes, leaguesRes] = await Promise.all([
          fetch(`${API_BASE}/meta/sports`),
          fetch(`${API_BASE}/meta/leagues`),
        ]);
        if (!sportsRes.ok || !leaguesRes.ok) {
          throw new Error("meta");
        }
        setSports((await sportsRes.json()) || []);
        setLeagues((await leaguesRes.json()) || []);
      } catch (err) {
        console.error("Error fetching meta:", err);
      }
    };
    fetchMeta();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (sport) params.append("sport", sport);
      if (league) params.append("league", league);
      if (country) params.append("country", country);
      if (sort) params.append("sort", sort);
      params.append("limit", String(DEFAULT_LIMIT));

      const res = await fetch(`${API_BASE}/articles?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setArticles((await res.json()) || []);
    } catch (err) {
      console.error("Error fetching articles:", err);
      setError("Failed to load articles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <div className="page-root">
      <section className="hero-banner">
        <div className="hero-banner-inner">
          <div className="hero-banner-logo">
            <img src={logo} alt="NinkoSports logo" />
          </div>
          <div className="hero-banner-text">
            <h1 className="hero-banner-title">NinkoSports</h1>
            <p className="hero-banner-subtitle">
              Your home for fast &amp; clean sports news
            </p>
          </div>
        </div>
      </section>

      <FilterBar
        sports={sports}
        leagues={leagues}
        sport={sport}
        league={league}
        country={country}
        sort={sort}
        onSportChange={setSport}
        onLeagueChange={setLeague}
        onCountryChange={setCountry}
        onSortChange={setSort}
        onApply={fetchArticles}
      />

      {loading && <p className="info-text">Loading articles...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && articles.length === 0 && (
        <p className="info-text">No articles found for this filter.</p>
      )}
      <main className="articles-grid">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/article/:slug" element={<ArticlePage apiBase={API_BASE} />} />
    </Routes>
  );
}
