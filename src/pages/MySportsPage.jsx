import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MAIN_SPORTS, OTHER_SPORTS, leaguePath } from "../config/sports.js";
import { readFavorites, toggleFavorite, writeFavorites } from "../lib/favorites.js";
import { setPageSeo } from "../lib/seo.js";
import { competitionLabel, sportLabel } from "../labels.js";

export default function MySportsPage() {
  const [favs, setFavs] = useState(() => readFavorites());

  useEffect(() => {
    setPageSeo({
      title: "My Sports | NinkoSports",
      description: "Follow sports and leagues on NinkoSports in this browser.",
      path: "/my-sports",
    });
  }, []);

  const sports = useMemo(() => [...MAIN_SPORTS, OTHER_SPORTS], []);
  const leagues = useMemo(
    () =>
      MAIN_SPORTS.flatMap((sport) =>
        sport.leagues
          .filter((item) => item.league)
          .map((item) => ({ ...item, sport: sport.slug }))
      ),
    []
  );

  const update = (next) => setFavs(next);

  return (
    <div className="page-favorites">
      <h1>My Sports</h1>
      <p className="lede">
        Follow sports and competitions in this browser. No account required.
        Favorites stay on this device until you sign in later.
      </p>

      <section className="section">
        <h2>Sports</h2>
        <div className="chip-list">
          {sports.map((sport) => {
            const key = sport.slug === "other" ? "other" : sport.slug;
            const on = favs.sports.includes(key);
            return (
              <button
                key={sport.slug}
                type="button"
                className={on ? "chip is-on" : "chip"}
                onClick={() => update(toggleFavorite("sports", key))}
              >
                {sport.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2>Competitions</h2>
        <div className="chip-list">
          {leagues.map((league) => {
            const on = favs.leagues.includes(league.league);
            return (
              <button
                key={league.league}
                type="button"
                className={on ? "chip is-on" : "chip"}
                onClick={() => update(toggleFavorite("leagues", league.league))}
              >
                {league.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2>Teams</h2>
        <p className="info-text">
          Team follows will be available when team pages and live sports data
          are connected. The favorites format already includes a teams list.
        </p>
      </section>

      {(favs.sports.length > 0 || favs.leagues.length > 0) && (
        <section className="section">
          <h2>Currently following</h2>
          <ul className="follow-list">
            {favs.sports.map((slug) => (
              <li key={slug}>
                <Link to={slug === "other" ? "/other-sports" : `/${slug}`}>
                  {sportLabel(slug)}
                </Link>
              </li>
            ))}
            {favs.leagues.map((league) => (
              <li key={league}>
                <Link to={leaguePath(guessSport(league), league)}>
                  {competitionLabel(league)}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => update(writeFavorites({ sports: [], leagues: [], teams: [] }))}
          >
            Clear favorites
          </button>
        </section>
      )}
    </div>
  );
}

function guessSport(league) {
  for (const sport of MAIN_SPORTS) {
    if (sport.leagues.some((item) => item.league === league)) return sport.slug;
  }
  return "football";
}
