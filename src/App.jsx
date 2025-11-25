import React, { useEffect, useState } from "react";
import ArticleCard from "./components/ArticleCard.jsx";
import FilterBar from "./components/FilterBar.jsx";

// Ako frontend hostuješ na istom domainu kao backend, možeš i samo:
// const API_BASE = "";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://TVOJ-RAILWAY-URL"; // <- OVDE STAVI SVOJ URL

function App() {
  const [articles, setArticles] = useState([]);
  const [sports, setSports] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filter state
  const [sport, setSport] = useState("");
  const [league, setLeague] = useState("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState("newest");
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    // povuci sports i leagues za filter drop-down
    const fetchMeta = async () => {
      try {
        const [sportsRes, leaguesRes] = await Promise.all([
          fetch(`${API_BASE}/meta/sports`),
          fetch(`${API_BASE}/meta/leagues`)
        ]);

        const sportsData = await sportsRes.json();
        const leaguesData = await leaguesRes.json();

        setSports(sportsData || []);
        setLeagues(leaguesData || []);
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

      const url = `${API_BASE}/articles?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setArticles(data || []);
    } catch (err) {
      console.error("Error fetching articles:", err);
      setError("Failed to load articles.");
    } finally {
      setLoading(false);
    }
  };

  // automatski load pri prvom otvaranju
  useEffect(() => {
    fetchArticles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-root">
      <header className="header">
        <h1>AllBallSports</h1>
        <p>Live sports news feed from your AI backend</p>
      </header>

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

export default App;
