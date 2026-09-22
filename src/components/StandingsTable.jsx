import React from "react";

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

export default function StandingsTable({ rows = [], sport = "football", empty }) {
  if (!rows.length) return empty || null;
  const sample = rows[0] || {};
  const preferred = PREFERRED[sport] || PREFERRED.football;
  const columns = preferred.filter((key) => rows.some((row) => row[key] != null && row[key] !== ""));
  const extras = Object.keys(sample).filter(
    (key) => !columns.includes(key) && !["team_slug", "id", "logo"].includes(key) && rows.some((row) => row[key] != null && row[key] !== "")
  );
  const all = columns.length ? columns : ["position", "team", ...extras];

  return (
    <div className="table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            {all.map((col) => (
              <th key={col} scope="col">
                {LABELS[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team_slug || row.team || index}>
              {all.map((col) => (
                <td key={col}>{row[col] ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
