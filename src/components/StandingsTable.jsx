import React from "react";
import { useI18n } from "../context/I18nContext.jsx";
import "./standingsResponsive.css";
import { Link } from "react-router-dom";
import { teamProfilePath } from "../lib/sportsData.js";
import { standingsGroups, preferredStandingsGroup } from "../lib/standingsGroups.js";

const PREFERRED = {
  football: ["position", "team", "played", "wins", "draws", "losses", "goals_for", "goals_against", "goal_difference", "points", "form"],
  basketball: ["position", "team", "played", "wins", "losses", "win_pct", "pct", "points_for", "points_against", "form"],
  "ice-hockey": ["position", "team", "played", "wins", "losses", "ot_losses", "goal_difference", "points"],
  baseball: ["position", "team", "wins", "losses", "pct", "group"],
  rugby: ["position", "team", "played", "wins", "draws", "losses", "points"],
  volleyball: ["position", "team", "played", "wins", "losses", "sets_for", "sets_against", "points"],
  "table-tennis": ["position", "team", "played", "wins", "losses", "sets_for", "sets_against", "points"],
  "australian-rules": ["position", "team", "played", "wins", "losses", "draws", "percentage", "points"],
};

// Compact is a mobile presentation only. Full source columns remain available.
const COMPACT = {
  football: ["position", "team", "played", "goal_difference", "points"],
  basketball: ["position", "team", "played", "wins", "losses", "win_pct", "pct"],
  "ice-hockey": ["position", "team", "played", "wins", "losses", "points"],
  baseball: ["position", "team", "wins", "losses", "pct"],
  rugby: ["position", "team", "played", "wins", "points"],
  volleyball: ["position", "team", "played", "wins", "losses", "points"],
  "table-tennis": ["position", "team", "played", "wins", "losses", "points"],
  "australian-rules": ["position", "team", "played", "percentage", "points"],
};
const TABLE_UI = {
  en: ["Full table", "Compact table", "Swipe sideways for all columns. Team names stay visible.", "Standings table"],
  sr: ["Cela tabela", "Sažeta tabela", "Prevuci levo/desno za sve kolone. Imena timova ostaju vidljiva.", "Tabela takmičenja"],
  es: ["Tabla completa", "Tabla compacta", "Desliza para ver todas las columnas. Los equipos siguen visibles.", "Clasificación"],
  de: ["Vollständige Tabelle", "Kompakte Tabelle", "Seitlich wischen für alle Spalten. Teamnamen bleiben sichtbar.", "Tabelle"],
  fr: ["Tableau complet", "Tableau compact", "Balayez pour voir toutes les colonnes. Les équipes restent visibles.", "Classement"],
  it: ["Tabella completa", "Tabella compatta", "Scorri per tutte le colonne. Le squadre restano visibili.", "Classifica"],
  pt: ["Tabela completa", "Tabela compacta", "Deslize para ver todas as colunas. As equipes continuam visíveis.", "Classificação"],
};

function TeamCell({ row, sport, competition, competitionCountry }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [row.logo, row.crest, row.badge, row.team_logo, row.teamLogo]);
  const logo = !failed ? (row.logo || row.crest || row.badge || row.team_logo || row.teamLogo || "") : "";
  const name = row.team ?? "—";
  const side = {
    id: row.team_id || row.id || "",
    slug: row.team_slug || "",
    name,
    display_name: name,
    logo,
  };
  const path = teamProfilePath(
    side,
    { sport, competition_key: competition, country_id: row.country_id || competitionCountry },
    name
  );
  const content = (
    <>
      {logo ? (
        <img
          className="standings-team-logo"
          src={logo}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="standings-team-logo is-missing" data-asset-missing="team-logo" aria-hidden="true">◆</span>
      )}
      <span>{name}</span>
    </>
  );
  return path && path !== "/live-scores" ? (
    <Link className="standings-team" to={path} style={{ color: "inherit", textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    <span className="standings-team">{content}</span>
  );
}

const LABELS = {
  position: "Pos",
  team: "Team",
  played: "P",
  wins: "W",
  draws: "D",
  losses: "L",
  goals_for: "GF",
  goals_against: "GA",
  form: "Form",
  goal_difference: "GD",
  point_difference: "PD",
  points: "Pts",
  pct: "PCT",
  win_pct: "PCT",
  percentage: "%",
  points_for: "PF",
  points_against: "PA",
  sets_for: "SF",
  sets_against: "SA",
  conference: "Conf",
  division: "Div",
  gb: "GB",
};

export default function StandingsTable({
  rows = [],
  sport = "football",
  competition = "",
  competitionCountry = "",
  event = {},
  empty,
}) {
  const { lang } = useI18n();
  const ui = TABLE_UI[lang] || TABLE_UI.en;
  const [expanded, setExpanded] = React.useState(false);
  const tableRef = React.useRef(null);
  const tableId = React.useId();
  React.useEffect(() => {
    setExpanded(false);
    if (tableRef.current) tableRef.current.scrollLeft = 0;
  }, [competition, event.id, sport]);
  const groups = React.useMemo(() => standingsGroups(rows), [rows]);
  const preferredGroup = preferredStandingsGroup(groups, event);
  const [selectedGroup, setSelectedGroup] = React.useState(preferredGroup);
  React.useEffect(() => setSelectedGroup(preferredGroup), [competition, event.id, preferredGroup]);
  const selected = groups.find(group => group.key === selectedGroup)
    || groups.find(group => group.key === preferredGroup);
  const visibleRows = selected?.rows || (groups.length === 1 ? rows : []);
  if (!rows.length) return empty || null;
  const sample = visibleRows[0] || {};
  const preferred = PREFERRED[sport] || PREFERRED.football;
  const columns = preferred.filter((key) => rows.some((row) => row[key] != null && row[key] !== ""));
  const extras = Object.keys(sample).filter(
    (key) =>
      !columns.includes(key) &&
      !["team_slug", "team_id", "id", "logo", "crest", "badge", "team_logo", "teamLogo", "country_id"].includes(key) &&
      rows.some((row) => row[key] != null && row[key] !== "")
  );
  const all = columns.length ? columns : ["position", "team", ...extras];
  const compact = COMPACT[sport] || COMPACT.football;
  const hasMoreColumns = all.some(col => !compact.includes(col));
  const columnClass = col => `standings-col-${col} ${compact.includes(col) ? "is-summary" : "is-detail"}`;
  const toggleExpanded = () => {
    setExpanded(value => !value);
    if (tableRef.current) tableRef.current.scrollLeft = 0;
  };

  return (
    <div className={`standings-grouped standings-responsive ${expanded ? "is-expanded" : "is-compact"}`}>
      {groups.length > 1 ? (
        <label className="standings-group-control">
          <span>Group</span>
          <select aria-label="Standings group" value={selected?.key || ""} onChange={e => setSelectedGroup(e.target.value)}>
            {!selected ? <option value="">Select a group</option> : null}
            {groups.map(group => <option key={group.key} value={group.key}>{group.label}</option>)}
          </select>
        </label>
      ) : null}
      {selected && groups.length > 1 ? <h3 className="standings-group-heading">{selected.label}</h3> : null}
      {hasMoreColumns ? (
        <div className="standings-mobile-tools">
          <button type="button" className="standings-view-toggle" aria-expanded={expanded} aria-controls={tableId} onClick={toggleExpanded}>
            {expanded ? ui[1] : ui[0]}
          </button>
          {expanded ? <span className="standings-scroll-hint" id={`${tableId}-hint`}>{ui[2]}</span> : null}
        </div>
      ) : null}
      <div className="table-wrap standings-viewport" id={tableId} ref={tableRef} role="region" aria-label={ui[3]} aria-describedby={expanded && hasMoreColumns ? `${tableId}-hint` : undefined} tabIndex={0}>
      <table className="standings-table">
        <thead>
          <tr>
            {all.map((col) => (
              <th key={col} scope="col" className={columnClass(col)} data-column={col}>
                {LABELS[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => (
            <tr key={row.team_slug || row.team || index}>
              {all.map((col) => (
                <td key={col} className={columnClass(col)} data-column={col}>
                  {col === "team" ? (
                    <TeamCell
                      row={row}
                      sport={sport}
                      competition={competition}
                      competitionCountry={competitionCountry}
                    />
                  ) : (
                    row[col] ?? "—"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
