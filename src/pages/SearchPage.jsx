import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMeta, searchArticles } from "../api.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { setPageSeo } from "../lib/seo.js";
import { competitionLabel, sportLabel } from "../labels.js";
import ArticleCard from "../components/ArticleCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SearchBox from "../components/SearchBox.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [sport, setSport] = useState(params.get("sport") || "");
  const [league, setLeague] = useState(params.get("league") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ sports: [], leagues: [] });
  const debounced = useDebouncedValue(query, 300);

  useEffect(() => {
    setPageSeo({
      title: "Search | NinkoSports",
      description: "Search NinkoSports stories by title, sport or competition.",
      path: "/search",
    });
    getMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debounced) next.set("q", debounced);
    if (sport) next.set("sport", sport);
    if (league) next.set("league", league);
    setParams(next, { replace: true });
  }, [debounced, sport, league, setParams]);

  useEffect(() => {
    let cancelled = false;
    if (!debounced || debounced.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    searchArticles(debounced.trim(), { sport, league })
      .then((rows) => {
        if (!cancelled) setResults(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, sport, league]);

  const leagues = useMemo(
    () =>
      sport
        ? meta.leagues.filter((item) => item.sport === sport)
        : meta.leagues,
    [meta.leagues, sport]
  );

  const tooShort = query.trim().length > 0 && query.trim().length < 2;

  return (
    <div className="page-search">
      <h1>Search</h1>
      <SearchBox value={query} onChange={setQuery} autoFocus />
      <div className="filter-row">
        <label>
          Sport
          <select
            value={sport}
            onChange={(event) => {
              setSport(event.target.value);
              setLeague("");
            }}
          >
            <option value="">All sports</option>
            {meta.sports.map((item) => (
              <option key={item} value={item}>
                {sportLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Competition
          <select value={league} onChange={(event) => setLeague(event.target.value)}>
            <option value="">All competitions</option>
            {leagues.map((item) => (
              <option key={item.league} value={item.league}>
                {item.label || competitionLabel(item.league)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {tooShort && <p className="info-text">Type at least two characters.</p>}
      {loading && <CardSkeleton count={4} />}
      {!loading && debounced.trim().length >= 2 && results.length === 0 && (
        <EmptyState
          title="No results"
          body={`Nothing matched “${debounced}”. Try a different title, sport or league.`}
        />
      )}
      {!loading && results.length > 0 && (
        <div className="card-grid">
          {results.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
