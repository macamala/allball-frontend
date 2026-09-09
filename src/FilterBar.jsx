import React from "react";
import { countryLabel, sportLabel, competitionLabel } from "./labels.js";

function FilterBar({
  sports,
  leagues,
  sport,
  league,
  country,
  sort,
  onSportChange,
  onLeagueChange,
  onCountryChange,
  onSortChange,
  onApply,
}) {
  const filteredLeagues = sport
    ? leagues.filter((item) => item.sport === sport)
    : leagues;

  const countries = Array.from(
    new Set((leagues || []).map((item) => item.country).filter(Boolean))
  ).sort((a, b) => countryLabel(a).localeCompare(countryLabel(b)));

  return (
    <section className="filter-bar">
      <div className="filter-row">
        <div className="filter-group">
          <label htmlFor="filter-sport">Sport</label>
          <select
            id="filter-sport"
            value={sport}
            onChange={(e) => {
              onSportChange(e.target.value);
              onLeagueChange("");
            }}
          >
            <option value="">All sports</option>
            {sports.map((item) => (
              <option key={item} value={item}>
                {sportLabel(item)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-league">Competition</label>
          <select
            id="filter-league"
            value={league}
            onChange={(e) => onLeagueChange(e.target.value)}
          >
            <option value="">All competitions</option>
            {filteredLeagues.map((item) => (
              <option key={item.league} value={item.league}>
                {item.label || competitionLabel(item.league)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-country">Country</label>
          <select
            id="filter-country"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
          >
            <option value="">All countries</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {countryLabel(item)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label htmlFor="filter-sort">Sort</label>
          <select
            id="filter-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <button className="apply-btn" onClick={onApply} type="button">
          Apply filters
        </button>
      </div>
    </section>
  );
}

export default FilterBar;
