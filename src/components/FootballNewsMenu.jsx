import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { footballNewsGroups, footballNewsPath } from "../config/newsFootball.js";
import { useI18n } from "../context/I18nContext.jsx";
import "./FootballNewsMenu.css";
import LeagueNewsPreview from "./LeagueNewsPreview.jsx";
import NewsRefreshBar from "./NewsRefreshBar.jsx";

const normalize = (value) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function FootballNewsMenu({ directory = false, current = "" }) {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const groups = useMemo(() => footballNewsGroups(lang), [lang]);
  if (!directory) return (
    <nav className="news-league-switcher" aria-label={t("news.leagues")}>
      <label htmlFor="football-news-league">{t("news.chooseLeague")}</label>
      <select id="football-news-league" value={current} onChange={(event) => {
        const row = groups.flatMap((group) => group.leagues).find((league) => league.league === event.target.value);
        if (row) navigate(footballNewsPath(row));
      }}>
        <option value="" disabled>{t("news.chooseLeague")}</option>
        {groups.map((group) => <optgroup key={group.country} label={group.label || t("international")}>
          {group.leagues.map((row) => <option key={row.league} value={row.league}>{row.label}</option>)}
        </optgroup>)}
      </select>
      <Link to="/football/other-leagues">{t("news.allLeagues")}</Link>
    </nav>
  );
  const needle = normalize(query.trim());
  const visible = groups.map((group) => ({ ...group, leagues: group.leagues.filter((row) =>
    normalize(`${group.label} ${row.label} ${row.country} ${row.aliases.join(" ")}`).includes(needle))
  })).filter((group) => group.leagues.length);
  return (
    <section className="news-league-directory" aria-label={t("news.allLeagues")}>
      <p>Browse leagues and their latest published NinkoSports stories. Each story stays with its own competition.</p>
      <NewsRefreshBar onRefresh={() => { setRevision(value => value + 1); }} />
      <label htmlFor="football-news-search">{t("news.findLeague")}</label>
      <input id="football-news-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder={t("news.findLeague")} />
      <p className="news-league-count" role="status">{t("news.leagueCount", { count: visible.reduce((sum, group) => sum + group.leagues.length, 0) })}</p>
      <div className="news-league-countries">
        {visible.map((group) => <section key={group.country}>
          <h2>{group.label || t("international")}</h2>
          <ul>{group.leagues.map((row) => <li key={row.league}>
            <Link className="news-directory-league-link" to={footballNewsPath(row)}>{row.label}<span aria-hidden="true"> →</span></Link>
            <LeagueNewsPreview league={row.league} revision={revision} />
          </li>)}</ul>
        </section>)}
      </div>
      {!visible.length && <p>{t("news.leaguesNoMatch")}</p>}
    </section>
  );
}
