function text(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function standingsGroups(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const stage = String(row.stage || "").trim();
    const group = String(row.group || "").trim();
    const key = JSON.stringify([stage, group]);
    const label = stage && group && !text(group).startsWith(text(stage))
      ? `${stage} · ${group}` : group || stage || "Table";
    if (!groups.has(key)) groups.set(key, { key, label, stage, group, rows: [] });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()];
}

export function preferredStandingsGroup(groups, event = {}) {
  if (groups.length <= 1) return groups[0]?.key || "";
  if (event.group) {
    const exact = groups.filter(item => text(item.group) === text(event.group) || text(item.label) === text(event.group));
    if (exact.length === 1) return exact[0].key;
  }
  const home = event.home || {};
  const away = event.away || {};
  const contains = (group, side) => group.rows.some(row =>
    (side.id && row.team_id && String(side.id) === String(row.team_id)) ||
    (side.name && text(side.name) === text(row.team))
  );
  const matches = groups.filter(group => contains(group, home) && contains(group, away));
  if (matches.length === 1) return matches[0].key;
  return home.name || away.name ? "" : groups[0]?.key || "";
}

export function matchSectionFromHash(hash) {
  const value = String(hash || "").replace(/^#mc-(?:panel-)?/, "");
  return ["overview", "stats", "lineups", "players", "scorecard", "shots", "h2h", "classification", "standings", "news"].includes(value)
    ? value : "overview";
}
