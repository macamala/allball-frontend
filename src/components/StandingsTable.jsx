import React from "react";

const PREFERRED = {
  football: ["position", "team", "played", "wins", "draws", "losses", "goal_difference", "points"],
  basketball: ["position", "team", "wins", "losses", "pct", "conference", "division"],
  "ice-hockey": ["position", "team", "played", "wins", "losses", "goal_difference", "points"],
  baseball: ["position", "team", "wins", "losses", "pct", "gb"],
};

const LABELS = {
  position: "Pos",
  team: "Team",
  played: "P",
  wins: "W",
  draws: "D",
  losses: "L",
  goal_difference: "GD",
  point_difference: "PD",
  points: "Pts",
  pct: "PCT",
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
