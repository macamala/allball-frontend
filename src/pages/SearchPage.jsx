import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMeta, searchArticles } from "../api.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { setPageSeo } from "../lib/seo.js";
import { competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";
import ArticleCard from "../components/ArticleCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SearchBox from "../components/SearchBox.jsx";
import { CardSkeleton } from "../components/Skeleton.jsx";

export default function SearchPage() {
  const { t } = useI18n();
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
      title: `${t("search.title")} | NinkoSports`,
      description: t("search.placeholder"),
      path: "/search",
    });
    getMeta().then(setMeta).catch(() => {});
  }, [t]);

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
      <h1>{t("search.title")}</h1>
      <SearchBox value={query} onChange={setQuery} autoFocus />
      <div className="filter-row">
        <label>
          {t("sport.label")}
          <select
            value={sport}
            onChange={(event) => {
              setSport(event.target.value);
              setLeague("");
            }}
          >
            <option value="">{t("search.allSports")}</option>
            {meta.sports.map((item) => {
              const key = sportI18nKey(item);
              return (
                <option key={item} value={item}>
                  {key ? t(key) : item}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          {t("section.competition")}
          <select value={league} onChange={(event) => setLeague(event.target.value)}>
            <option value="">{t("search.allCompetitions")}</option>
            {leagues.map((item) => (
              <option key={item.league} value={item.league}>
                {item.label || competitionLabel(item.league)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {tooShort && <p className="info-text">{t("search.tooShort")}</p>}
      {loading && <CardSkeleton count={4} />}
      {!loading && debounced.trim().length >= 2 && results.length === 0 && (
        <EmptyState
          compact
          title={t("search.noResults")}
          body={t("search.noResultsBody", { q: debounced })}
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
