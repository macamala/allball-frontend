import React from "react";

const FOOTBALL_COLS = [
  { key: "position", label: "Pos" },
  { key: "team", label: "Team" },
  { key: "played", label: "P" },
  { key: "wins", label: "W" },
  { key: "draws", label: "D" },
  { key: "losses", label: "L" },
  { key: "goal_difference", label: "GD" },
  { key: "points", label: "Pts" },
];

const BASKETBALL_COLS = [
  { key: "position", label: "Pos" },
  { key: "team", label: "Team" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "pct", label: "PCT" },
  { key: "conference", label: "Conf" },
  { key: "division", label: "Div" },
];

export default function StandingsTable({
  rows = [],
  sport = "football",
  empty,
}) {
  const columns = sport === "basketball" ? BASKETBALL_COLS : FOOTBALL_COLS;
  if (!rows.length) return empty || null;

  return (
    <div className="table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team_slug || row.team || index}>
              {columns.map((col) => (
                <td key={col.key}>{row[col.key] ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
