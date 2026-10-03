/** News presentation only. No sporting records or inferred table statistics. */
export function competitionKey(data) {
  const meta = data?.competition;
  return typeof meta === 'string' ? meta : meta?.id || meta?.competition_id || '';
}

export function seasonIdentity(value) {
  const text = String(value || '').trim();
  const pair = /^(\d{4})[/-](\d{4}|\d{2})$/.exec(text);
  if (!pair) return text;
  const first = Number(pair[1]);
  const second = pair[2].length === 2 ? Math.floor(first / 100) * 100 + Number(pair[2]) : Number(pair[2]);
  return second === first + 1 ? `${first}/${second}` : text;
}
export const sameNewsSeason = (a, b) => Boolean(a && b && seasonIdentity(a) === seasonIdentity(b));

export function localNewsDate(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function day(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error('Choose both dates.');
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  if (localNewsDate(parsed) !== value || y < 1900 || y > 2200) throw new Error('Choose valid calendar dates.');
  return parsed;
}

/** Calendar-day selection in the reader's timezone; end is exclusive. */
export function newsDateRange(dateFrom, dateTo) {
  const start = day(dateFrom), endDay = day(dateTo);
  const days = (Date.UTC(endDay.getFullYear(), endDay.getMonth(), endDay.getDate()) -
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000;
  if (days < 0) throw new Error('The end date must not be before the start date.');
  if (days > 92) throw new Error('Choose a date range of at most 93 days.');
  const end = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate() + 1);
  return { dateFrom, dateTo, from: start.toISOString(), to: new Date(end.getTime() - 1).toISOString(),
    start: start.getTime(), end: end.getTime(), key: `${start.toISOString()}/${end.toISOString()}` };
}

export function newsTeamName(name) {
  // Only explicit club affixes; never strip Women, B, II or youth qualifiers.
  return String(name || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .replace(/^(?:fc|afc|fk|cf)\s+/, '').replace(/\s+(?:fc|afc|fk|cf)$/, '').trim();
}

const photo = value => typeof value === 'string' && /^https:\/\//i.test(value) ? value : '';

/** Reuse a real crest already supplied for the exact club in THIS payload. */
export function decorateNewsIdentity(data, supplemental = null) {
  if (!data || typeof data !== 'object') return data;
  const key = competitionKey(data);
  const extra = supplemental && competitionKey(supplemental) === key &&
    (!data.season || !supplemental.season || sameNewsSeason(data.season, supplemental.season)) ? supplemental : null;
  const events = (Array.isArray(data.events) ? data.events : []).filter(e => e?.sport === 'football' && e.competition_key === key);
  const entries = [];
  for (const source of [data, extra].filter(Boolean)) {
    if (Array.isArray(source.rows)) for (const row of source.rows) entries.push({
      name: row.team, id: row.team_id, logo: row.logo || row.crest || row.badge || row.team_logo });
    if (Array.isArray(source.teams)) entries.push(...source.teams);
    for (const e of (Array.isArray(source.events) ? source.events : [])) if (e?.sport === 'football' && e.competition_key === key) entries.push(e.home, e.away);
  }
  const byName = new Map();
  for (const side of entries) {
    if (!side || !side.name) continue;
    const name = newsTeamName(side.name);
    const entry = byName.get(name) || { ids: new Set(), photos: new Set() };
    if (side.id != null && side.id !== '') entry.ids.add(String(side.id));
    if (photo(side.logo)) entry.photos.add(side.logo);
    byName.set(name, entry);
  }
  function enrich(side) {
    if (!side || photo(side.logo)) return side;
    const match = byName.get(newsTeamName(side.name));
    if (!match || !match.photos.size || match.ids.size > 1) return side;
    if (side.id && match.ids.size && !match.ids.has(String(side.id))) return side;
    if (!match.ids.size && match.photos.size > 1) return side;
    return { ...side, logo: [...match.photos][0] };
  }
  const logos = new Set(events.map(e => e.competition_logo).filter(photo));
  const meta = typeof data.competition === 'object' ? data.competition : { id: key };
  const extraMeta = typeof extra?.competition === 'object' ? extra.competition : {};
  const competition = { ...meta };
  if (!competition.logo) competition.logo = extraMeta.logo || (logos.size === 1 ? [...logos][0] : null);
  const result = { ...data, competition };
  if (Array.isArray(data.events)) result.events = events.map(e => ({ ...e, home: enrich(e.home), away: enrich(e.away) }));
  if (Array.isArray(data.rows)) result.rows = data.rows.map(row => ({ ...row,
    ...(row.logo ? {} : { logo: enrich({ name: row.team, id: row.team_id, logo: row.logo })?.logo }),
    ...(row.wins == null && row.won != null ? { wins: row.won } : {}),
    ...(row.draws == null && row.drawn != null ? { draws: row.drawn } : {}),
    ...(row.losses == null && row.lost != null ? { losses: row.lost } : {}),
  }));
  return result;
}

/** Snapshot completeness is not proof of full upstream league coverage. */
export function newsDataNotice(data, view) {
  if (!data) return null;
  const stale = Boolean(data.stale || data.coverage?.stale);
  if (stale) return 'Saved data may be out of date. Scores and standings have not been inferred or refreshed by this page.';
  if (data._newsRead?.partial) return 'Only part of the requested data was returned. This is not a complete competition record.';
  if (data.coverage?.truncated) return 'Only the available stored record window is shown; this is not the full season schedule.';
  if (view === 'standings' && !data.rows?.length) return 'Standings have not been supplied for this selection. No table is calculated from partial match results.';
  return null;
}
