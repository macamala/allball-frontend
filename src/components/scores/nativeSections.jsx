import { participantName } from "../../lib/sportsData.js";

function dash(left, right) {
  const home = left == null || left === "" ? "–" : left;
  const away = right == null || right === "" ? "–" : right;
  return `${home} – ${away}`;
}

function personName(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.name || [value.firstname, value.lastname].filter(Boolean).join(" ");
}

export function sideNames(rubber, side) {
  const list = rubber?.[`${side}_players`];
  if (Array.isArray(list) && list.length) {
    return list.map(personName).filter(Boolean).join(" / ");
  }
  return [personName(rubber?.[`${side}_player`]), personName(rubber?.[`${side}_partner`])].filter(Boolean).join(" / ");
}

export function meetingRubbers(event) {
  const rows = event?.sport_detail?.rubbers;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row && (row.home_player || row.away_player || row.home_players || row.games));
}

export function cricketInnings(event) {
  const rows = Array.isArray(event?.innings) ? event.innings : [];
  return rows.filter((row) => row && (row.runs != null || row.wickets != null || row.overs != null));
}

export function scorecardTables(event) {
  const detail = event?.sport_detail || {};
  const blocks = [];
  ["batting", "bowling"].forEach((key) => {
    const rows = detail[key] || event?.[key];
    if (Array.isArray(rows) && rows.length) blocks.push({ key, rows });
  });
  return blocks;
}

export function rugbyScoring(event) {
  const detail = event?.sport_detail || {};
  return ["tries", "conversions", "penalties"]
    .map((key) => {
      const row = detail[key];
      if (!row || typeof row !== "object") return null;
      if (row.home == null && row.away == null) return null;
      return { key, home: row.home, away: row.away };
    })
    .filter(Boolean);
}

export function seriesGames(event) {
  const maps = Array.isArray(event?.maps) ? event.maps : [];
  const games = Array.isArray(event?.sport_detail?.games) ? event.sport_detail.games : [];
  return maps.length ? maps : games;
}

const CLASS_COLUMNS = [
  ["position", "Pos"],
  ["name", "Name"],
  ["team", "Team"],
  ["constructor", "Team"],
  ["grid", "Grid"],
  ["laps", "Laps"],
  ["gap", "Time / gap"],
  ["time", "Time"],
  ["status", "Status"],
  ["fastest_lap", "Fastest lap"],
  ["points", "Pts"],
  ["total", "Total"],
];

function own(row, key) {
  if (!row || typeof row !== "object" || !Object.prototype.hasOwnProperty.call(row, key)) return undefined;
  const value = row[key];
  return typeof value === "function" ? undefined : value;
}

export function classificationColumns(rows) {
  const objects = rows.filter((row) => row && typeof row === "object");
  if (!objects.length) return [];
  const used = new Set();
  return CLASS_COLUMNS.filter(([key]) => {
    if (key === "constructor" && objects.some((row) => own(row, "team"))) return false;
    if (key === "time" && objects.some((row) => own(row, "gap"))) return false;
    if (!objects.some((row) => own(row, key) != null && own(row, key) !== "")) return false;
    if (key === "name" && !objects.some((row) => own(row, "name") || own(row, "player") || own(row, "driver"))) return false;
    if (used.has(key)) return false;
    used.add(key);
    return true;
  });
}

export function formatDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return value == null ? "" : String(value);
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

export function Rubbers({ rubbers }) {
  if (!rubbers.length) return null;
  return (
    <section className="mc-card" id="mc-rubbers">
      <h2>Rubbers</h2>
      <ol className="mc-rubbers">
        {rubbers.map((rubber, index) => {
          const home = sideNames(rubber, "home");
          const away = sideNames(rubber, "away");
          const games = Array.isArray(rubber.games) ? rubber.games : [];
          return (
            <li key={rubber.label || index} className="mc-rubber">
              <div className="mc-rubber-head">
                <strong>
                  {home || "Home"}
                  <span className="mc-rubber-vs"> vs </span>
                  {away || "Away"}
                </strong>
                <span className="mc-rubber-score">{dash(rubber.home, rubber.away)}</span>
              </div>
              {games.length ? (
                <ol className="mc-rubber-games">
                  {games.map((game, gameIndex) => (
                    <li key={game.label || gameIndex}>{dash(game.home, game.away)}</li>
                  ))}
                </ol>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Innings({ rows, detail }) {
  if (!rows.length) return null;
  const winBy = detail?.win_by;
  const margin = winBy?.wickets != null ? `${winBy.wickets} wickets` : winBy?.runs != null ? `${winBy.runs} runs` : "";
  return (
    <section className="mc-card" id="mc-innings">
      <h2>Innings</h2>
      <ol className="mc-innings">
        {rows.map((row, index) => (
          <li key={row.label || index}>
            <strong>{row.label || `Innings ${index + 1}`}</strong>
            <span>
              {row.runs != null ? row.runs : "–"}
              {row.wickets != null ? `/${row.wickets}` : ""}
              {row.overs != null ? ` (${row.overs} overs)` : ""}
            </span>
            {row.target != null ? <span className="mc-when">Target {row.target}</span> : null}
          </li>
        ))}
      </ol>
      {detail?.result ? <p>{detail.result}{margin ? ` by ${margin}` : ""}</p> : null}
    </section>
  );
}

export function Scorecard({ blocks }) {
  if (!blocks.length) return null;
  return (
    <section className="mc-card" id="mc-scorecard">
      <h2>Scorecard</h2>
      {blocks.map((block) => (
        <div key={block.key}>
          <h3>{block.key === "bowling" ? "Bowling" : "Batting"}</h3>
          <ul>
            {block.rows.map((row, index) => (
              <li key={row.name || index}>
                {row.name || row.player}
                {row.runs != null ? ` ${row.runs}` : ""}
                {row.wickets != null ? ` / ${row.wickets}` : ""}
                {row.overs != null ? ` (${row.overs})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function AflScore({ event }) {
  const detail = event?.sport_detail || {};
  if (!detail.goals) return null;
  const rows = [
    ["Goals", detail.goals],
    ["Behinds", detail.behinds],
    ["Score", detail.score || event.score],
  ].filter(([, row]) => row && (row.home != null || row.away != null));
  return (
    <section className="mc-card" id="mc-score">
      <h2>Score</h2>
      <dl className="mc-dl">
        {rows.map(([label, row]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{dash(row.home, row.away)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function RugbyScore({ rows, home, away }) {
  if (!rows.length) return null;
  return (
    <section className="mc-card" id="mc-rugby">
      <h2>Scoring</h2>
      <table className="mc-sets">
        <thead>
          <tr>
            <th />
            {rows.map((row) => (
              <th key={row.key}>{row.key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>{home}</th>
            {rows.map((row) => (
              <td key={row.key}>{row.home ?? "–"}</td>
            ))}
          </tr>
          <tr>
            <th>{away}</th>
            {rows.map((row) => (
              <td key={row.key}>{row.away ?? "–"}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export function ClassificationTable({ rows }) {
  const columns = classificationColumns(rows);
  if (!columns.length) return null;
  return (
    <div className="mc-scroll">
      <table className="mc-sets mc-class">
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th key={key}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.name || index}>
              {columns.map(([key]) => (
                <td key={key}>
                  {key === "name" ? own(row, "name") || own(row, "player") || own(row, "driver") || own(row, "label") || "–" : own(row, key) ?? "–"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function sideLine(row, side) {
  const team = row?.[side];
  if (!team || typeof team !== "object") return "";
  const name = team.name || side;
  const kills = team.kills == null ? "" : ` ${team.kills}`;
  return `${side} ${name}${kills}`.trim();
}

export function Games({ games, event }) {
  if (!games.length) return null;
  const bestOf = event?.best_of || event?.sport_detail?.best_of;
  return (
    <section className="mc-card" id="mc-maps">
      <h2>Games</h2>
      {bestOf ? <p className="mc-when">Best of {bestOf}</p> : null}
      <ol className="mc-innings">
        {games.map((row, index) => {
          const sides = [sideLine(row, "blue"), sideLine(row, "red")].filter(Boolean).join(" · ");
          return (
            <li key={row.id || row.name || index}>
              <strong>{row.name || row.map || row.label || `Game ${index + 1}`}</strong>
              <span>
                {sides || (row.home != null || row.away != null ? dash(row.home, row.away) : "")}
                {row.winner ? ` · ${row.winner}` : ""}
                {row.duration != null ? ` · ${formatDuration(row.duration)}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const PLAYER_FIELDS = [
  ["points", "PTS"],
  ["rebounds", "REB"],
  ["assists", "AST"],
  ["goals", "G"],
  ["rating", "Rating"],
  ["tries", "Tries"],
  ["at_bats", "AB"],
  ["hits", "H"],
  ["rbi", "RBI"],
  ["innings_pitched", "IP"],
  ["strikeouts", "K"],
];

export function PlayerTable({ rows, event }) {
  if (!rows.length) return null;
  const combat = rows.some((row) => row.kills != null);
  const fields = combat ? [] : PLAYER_FIELDS.filter(([key]) => rows.some((row) => row[key] != null && row[key] !== ""));
  const sides = ["home", "away"].filter((side) => rows.some((row) => row.side === side));
  const groups = sides.length ? sides.map((side) => [participantName(event[side]) || side, rows.filter((row) => row.side === side)]) : [["", rows]];
  return (
    <section className="mc-card" id="mc-players">
      <h2>Players</h2>
      {groups.map(([label, group]) => (
        <div key={label || "players"} className="mc-scroll">
          {label ? <h3>{label}</h3> : null}
          <table className="mc-sets mc-class">
            <thead>
              <tr>
                <th>Player</th>
                {combat ? <th>K/D/A</th> : null}
                {fields.map(([key, title]) => (
                  <th key={key}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.map((row, index) => (
                <tr key={row.id || row.name || index}>
                  <td>
                    {row.number ? `${row.number} ` : ""}
                    {row.name}
                    {row.hero ? ` · ${row.hero}` : ""}
                  </td>
                  {combat ? <td>{`${row.kills ?? 0}/${row.deaths ?? 0}/${row.assists ?? 0}`}</td> : null}
                  {fields.map(([key]) => (
                    <td key={key}>{row[key] ?? "–"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
