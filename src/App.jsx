import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import ArticleCard from "./ArticleCard.jsx";
import FilterBar from "./FilterBar.jsx";
import ArticlePage from "./ArticlePage.jsx";
import logo from "./assets/logo-ninkosports.png";

// Backend URL
const API_BASE = "https://allball-backend-production.up.railway.app";

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
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [sportsRes, leaguesRes] = await Promise.all([
          fetch(`${API_BASE}/meta/sports`),
          fetch(`${API_BASE}/meta/leagues`)
        ]);

        setSports(await sportsRes.json());
        setLeagues(await leaguesRes.json());
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
      if (limit) params.append("limit", String(limit));

      const res = await fetch(`${API_BASE}/articles?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setArticles(await res.json());
    } catch (err) {
      console.error("Error fetching articles:", err);
      setError("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <div className="page-root">

      {/* --------------------------------------  
          HERO BANNER – TAČNO KAO TVOJA SLIKA  
      --------------------------------------- */}
      <div
        style={{
          width: "100%",
          padding: "60px 20px",
          background: "linear-gradient(180deg, #020617, #0b1120)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          borderBottom: "2px solid #1e293b",
        }}
      >
        <img
          src={logo}
          alt="Logo"
          style={{
            width: "150px",
            height: "150px",
            objectFit: "contain",
            marginBottom: "15px",
          }}
        />

        <h1
          style={{
            fontSize: "4rem",
            fontWeight: "900",
            color: "white",
            margin: 0,
            textAlign: "center",
          }}
        >
          NinkoSports
        </h1>

        <p
          style={{
            fontSize: "1.4rem",
            color: "#cbd5e1",
            marginTop: "10px",
            textAlign: "center",
          }}
        >
          Your home for fast & clean sports news
        </p>
      </div>

      {/* FILTER BAR */}
      <FilterBar
        sports={sports}
        leagues={leagues}
        sport={sport}
        league={league}
        country={country}
        sort={sort}
        limit={limit}
        onSportChange={setSport}
        onLeagueChange={setLeague}
        onCountryChange={setCountry}
        onSortChange={setSort}
        onLimitChange={setLimit}
        onApply={fetchArticles}
      />

      {loading && <p className="info-text">Loading articles...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && articles.length === 0 && (
        <p className="info-text">No articles found.</p>
      )}

      <main className="articles-grid">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </main>
    </div>
  );
}

// MAIN ROUTER
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/article/:slug"
        element={<ArticlePage apiBase={API_BASE} />}
      />
    </Routes>
  );
}
