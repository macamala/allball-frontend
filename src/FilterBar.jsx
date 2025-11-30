import React from "react";

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
  // leagues filtriramo po sportu ako je izabran
  const filteredLeagues = sport
    ? leagues.filter((l) => l.sport === sport)
    : leagues;

  return (
    <section className="filter-bar">
      <div className="filter-row">
        <div className="filter-group">
          <label>Sport</label>
          <select
            value={sport}
            onChange={(e) => {
              onSportChange(e.target.value);
              onLeagueChange(""); // reset liga kad se promeni sport
            }}
          >
            <option value="">All</option>
            {sports.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>League</label>
          <select
            value={league}
            onChange={(e) => onLeagueChange(e.target.value)}
          >
            <option value="">All</option>
            {filteredLeagues.map((l) => (
              <option key={l.league} value={l.league}>
                {l.league}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Country</label>
          <input
            type="text"
            placeholder="england, spain..."
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label>Sort</label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <button className="apply-btn" onClick={onApply}>
          Apply filters
        </button>
      </div>
    </section>
  );
}

export default FilterBar;
