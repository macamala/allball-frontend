import React, { useEffect, useMemo, useState } from "react";
import {
  MAIN_SPORTS,
  OTHER_SPORTS,
  scopedCompetitionId,
  parseScopedCompetition,
} from "../config/sports.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { sportI18nKey } from "../i18n/index.js";
import { setPageSeo } from "../lib/seo.js";
import { competitionLabel } from "../labels.js";
import { normalizeLeagueId } from "../lib/favorites.js";

export default function MySportsPage() {
  const { favorites, syncFavorites } = useAuth();
  const { t } = useI18n();
  const [favs, setFavs] = useState(favorites);

  useEffect(() => {
    setFavs(favorites);
  }, [favorites]);

  useEffect(() => {
    setPageSeo({
      title: `${t("nav.mySports")} | NinkoSports`,
      description: t("favorites.lede"),
      path: "/my-sports",
      noindex: true,
    });
  }, [t]);

  const sports = useMemo(() => [...MAIN_SPORTS, OTHER_SPORTS], []);
  const leagues = useMemo(
    () =>
      MAIN_SPORTS.flatMap((sport) =>
        sport.leagues
          .filter((item) => item.league)
          .map((item) => ({
            ...item,
            sport: sport.slug,
            scoped: scopedCompetitionId(sport.slug, item.league),
          }))
      ),
    []
  );

  const update = (next) => {
    setFavs(next);
    syncFavorites(next);
  };

  const toggle = (type, value) => {
    const list = favs[type] || [];
    const exists = list.includes(value);
    const nextList = exists ? list.filter((item) => item !== value) : [...list, value];
    update({ ...favs, [type]: nextList });
  };

  return (
    <div className="page-favorites">
      <h1>{t("nav.mySports")}</h1>
      <p className="lede">{t("favorites.lede")}</p>

      <section className="section favorites-block">
        <h2>{t("favorites.sports")}</h2>
        <div className="chip-list">
          {sports.map((sport) => {
            const key = sport.slug === "other" ? "other" : sport.slug;
            const on = favs.sports.includes(key);
            const labelKey = sportI18nKey(sport.slug);
            return (
              <button
                key={sport.slug}
                type="button"
                className={on ? "chip is-on" : "chip"}
                aria-pressed={on}
                onClick={() => toggle("sports", key)}
              >
                {labelKey ? t(labelKey) : sport.label}
                <span className="chip-state">{on ? t("following") : t("follow")}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="section favorites-block">
        <h2>{t("favorites.competitions")}</h2>
        {MAIN_SPORTS.map((sport) => (
          <div key={sport.slug} className="favorites-sport-group">
            <h3>{t(sportI18nKey(sport.slug))}</h3>
            <div className="chip-list">
              {leagues
                .filter((league) => league.sport === sport.slug)
                .map((league) => {
                  const on = favs.leagues.includes(league.scoped);
                  const label =
                    league.path === "international" ? t("international") : league.label;
                  return (
                    <button
                      key={league.scoped}
                      type="button"
                      className={on ? "chip is-on" : "chip"}
                      aria-pressed={on}
                      onClick={() => toggle("leagues", league.scoped)}
                    >
                      {label}
                      <span className="chip-state">{on ? t("following") : t("follow")}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </section>

      <section className="section favorites-block">
        <h2>{t("favorites.teams")}</h2>
        <p className="info-text">{t("favorites.teamsSoon")}</p>
      </section>

      {(favs.sports.length > 0 || favs.leagues.length > 0) && (
        <section className="section favorites-block">
          <h2>{t("favorites.following")}</h2>
          <div className="chip-list following-chip-list">
            {favs.sports.map((slug) => {
              const key = sportI18nKey(slug);
              const label = key ? t(key) : slug;
              return (
                <button
                  key={slug}
                  type="button"
                  className="chip is-on"
                  aria-pressed="true"
                  onClick={() => toggle("sports", slug)}
                >
                  <span>{label}</span>
                  <span className="chip-state">{t("unfollow")}</span>
                </button>
              );
            })}
            {favs.leagues.map((league) => {
              const parsed = parseScopedCompetition(normalizeLeagueId(league));
              const label =
                parsed.competition?.endsWith("-international")
                  ? t("international")
                  : competitionLabel(parsed.competition || league);
              return (
                <button
                  key={league}
                  type="button"
                  className="chip is-on"
                  aria-pressed="true"
                  onClick={() => toggle("leagues", league)}
                >
                  <span>{label}</span>
                  <span className="chip-state">{t("unfollow")}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => update({ sports: [], leagues: [], teams: [] })}
          >
            {t("favorites.clear")}
          </button>
        </section>
      )}
    </div>
  );
}
