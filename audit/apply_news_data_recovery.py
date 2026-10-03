from pathlib import Path
import shutil

# Executed in a clean checkout of the reviewed production parent.
bundle = Path('../bundle/audit')
shutil.copyfile(bundle / 'newsFootballView.js', 'src/lib/newsFootballView.js')
shutil.copyfile(bundle / 'newsFootballRecovery.test.js', 'src/lib/newsFootballRecovery.test.js')

p = Path('src/lib/newsFootballData.js'); s = p.read_text()
s = "import { sameNewsSeason, newsTeamName } from './newsFootballView.js';\n" + s
s = s.replace("if (ACTIVE.has(status)) return 'fixtures';", "if (ACTIVE.has(status)) {\n    const observed = Date.parse(event?.updated_at || event?.score_observed_at || event?.start_time || '');\n    return Number.isFinite(observed) && now - observed > 6 * 3600000 ? 'other' : 'fixtures';\n  }")
s = s.replace("if (season && String(event.season || '') !== season) continue;", "if (season && !sameNewsSeason(event.season, season)) continue;")
s = s.replace("if (team && ![event.home.name, event.away.name].includes(team)) continue;", "if (team && ![event.home.name, event.away.name].some(name => newsTeamName(name) === newsTeamName(team))) continue;")
s = s.replace("season = '', team = '', group = '', now = Date.now()", "season = '', team = '', group = '', range = null, now = Date.now()")
s = s.replace("    if (season && !sameNewsSeason(event.season, season)) continue;", "    if (range && (Date.parse(event.start_time) < range.start || Date.parse(event.start_time) >= range.end)) continue;\n    if (season && !sameNewsSeason(event.season, season)) continue;")
a = s.index('async function boundedRead('); b = s.index('\nexport async function readNewsData', a)
s = s[:a] + '''async function boundedRead(get, path, signal, timeoutMs) {
  const controller = new AbortController();
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  let timer, abort;
  const cancelled = new Promise((_, reject) => {
    abort = () => { controller.abort(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
  });
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('News data request timed out')); }, timeoutMs);
  });
  try { return await Promise.race([get(path, { signal: controller.signal }), deadline, cancelled]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

/** Exact, cancellable, date-bounded reads of public retained records only. */
export async function readNewsDateRange(get, competition, range, { season = '', signal, timeoutMs = 12000 } = {}) {
  if (!range || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end <= range.start || range.end - range.start > 94 * 86400000)
    throw new Error('Invalid News date range');
  let empty = null, lastError;
  for (const key of newsDataKeys(competition)) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    try {
      const query = new URLSearchParams({ sport: 'football', competition: key, date_from: range.from, date_to: range.to });
      const raw = await boundedRead(get, `/sports-data/events?${query}`, signal, timeoutMs);
      if (!raw || raw.sport !== 'football' || raw.competition !== key || !Array.isArray(raw.events) ||
          raw.snapshot?.date_from !== range.from || raw.snapshot?.date_to !== range.to)
        throw new Error('Unverified public date-window scope');
      const partial = raw.snapshot.complete !== true || raw.snapshot.count !== raw.events.length;
      const data = { competition: { id: key, sport: 'football' }, events: raw.events, season: season || null,
        available: raw.connected !== false, _newsRead: { partial, rangeKey: range.key, readAt: new Date().toISOString() },
        coverage: { truncated: partial, scope: 'date_bounded_stored_records' } };
      data.events = newsMatches(data, competition, { season, range });
      if (data.events.length) return data;
      empty = data;
    } catch (error) { if (signal?.aborted) throw error; lastError = error; }
  }
  if (empty && !lastError) return empty;
  if (empty) return { ...empty, _newsRead: { ...empty._newsRead, partial: true } };
  throw lastError || new Error('Competition data is unavailable');
}
''' + s[b:]
s = s.replace("season = '', signal, timeoutMs = 12000, now = Date.now()", "season = '', signal, timeoutMs = 12000, now = Date.now(), range = null")
s = s.replace("  let empty = null, lastError;\n  for (const key of newsDataKeys(competition)) {\n    try {", "  if (range && view !== 'standings') return readNewsDateRange(get, competition, range, { season, signal, timeoutMs });\n  let empty = null, lastError;\n  for (const key of newsDataKeys(competition)) {\n    try {")
s = s.replace("(season && data.season && data.season !== season)", "(season && data.season && !sameNewsSeason(data.season, season))")
s = s.replace("(!season || row.season === season)", "(!season || sameNewsSeason(row.season, season))")
s = s.replace("if (!newsDataKeys(competition).includes(key) || (sport && sport !== 'football'))", "if (!newsDataKeys(competition).includes(key) || (sport && sport !== 'football') || (payload.sport && payload.sport !== 'football'))")
s = s.replace("if ((view === 'standings' ? data.rows : data.events)?.length) return data;", "if (!Array.isArray(view === 'standings' ? data.rows : data.events)) throw new Error('Unverified data structure');\n      if ((view === 'standings' ? data.rows : data.events).length) return data;")
s = s.replace('  if (empty) return empty;\n  throw lastError', "  if (empty) return lastError ? { ...empty, _newsRead: { partial: true } } : empty;\n  throw lastError")
p.write_text(s)

p = Path('src/lib/newsFootballCache.js'); s = p.read_text()
s = "import { sameNewsSeason } from './newsFootballView.js';\n" + s
s = s.replace('function keyFor(competition, view, season)', "function keyFor(competition, view, season, scope = '')")
s = s.replace("season || '']);", "season || '', scope]);")
s = s.replace("(!season || payload.season === season)", "(!season || sameNewsSeason(payload.season, season))")
s = s.replace('payload, now = Date.now())', "payload, now = Date.now(), scope = '')")
s = s.replace("season = '', now = Date.now())", "season = '', now = Date.now(), scope = '')")
s = s.replace('keyFor(competition, view, season);', 'keyFor(competition, view, season, scope);')
s = s.replace("if (!key || !Number.isFinite(now) || !valid(payload, competition, view, season)) return false;", "if (!key || !Number.isFinite(now) || !valid(payload, competition, view, season) || (scope && payload._newsRead?.rangeKey !== scope)) return false;")
p.write_text(s)

p = Path('src/components/FootballNewsData.jsx'); s = p.read_text()
s = s.replace("import '../styles/newsFootballData.css';", "import { decorateNewsIdentity, newsDateRange, localNewsDate, newsDataNotice, sameNewsSeason, seasonIdentity, newsTeamName } from '../lib/newsFootballView.js';\nimport '../styles/newsFootballData.css';")
s = s.replace("    : at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });", "    : event.start_precision && event.start_precision !== 'EXACT_TIME' ? 'Time TBC'\n    : at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });")
s = s.replace("{event.round ? <small>Round {event.round}</small> : null}", "{event.round ? <small>{/^(?:round|matchday|week|leg)\\b/i.test(String(event.round)) ? event.round : `Round ${event.round}`}</small> : null}")
s = s.replace("  const [season, setSeason] = useState('');", """  const [season, setSeason] = useState('');
  const [dateFrom, setDateFrom] = useState(() => localNewsDate());
  const [dateTo, setDateTo] = useState(() => localNewsDate());
  const [range, setRange] = useState(null);
  const [dateError, setDateError] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);""")
s = s.replace("  const path = newsDataPath(competition, view, season);", """  const basePath = newsDataPath(competition, view, season);
  const scope = view === 'standings' ? '' : range?.key || '';
  const path = basePath ? `${basePath}|${scope}` : null;""")
s = s.replace('peekNewsData(competition, view, season)', 'peekNewsData(competition, view, season, Date.now(), scope)')
s = s.replace('rememberNewsData(competition, view, season, data);', 'rememberNewsData(competition, view, season, data, Date.now(), scope);')
s = s.replace('{ season, signal: controller.signal }', "{ season, range: view === 'standings' ? null : range, signal: controller.signal }")
s = s.replace('(season && data.season && data.season !== season)', '(season && data.season && !sameNewsSeason(data.season, season))')
s = s.replace('[path, competition, view, season, retry]', '[path, competition, view, season, range, scope, retry]')
s = s.replace('  const data = resource.path === path ? resource.data : null;', """  const data = useMemo(() => {
    const raw = resource.path === path ? resource.data : null;
    const saved = peekNewsData(competition, view === 'standings' ? 'fixtures' : 'standings', season);
    return decorateNewsIdentity(raw, saved?.data);
  }, [resource, path, competition, view, season]);""")
s = s.replace('  const seasons = knownSeasons;', '  const seasons = [...new Set(knownSeasons.map(seasonIdentity))].sort().reverse();')
s = s.replace('  const teams = [...new Set(allEvents.flatMap(row => [row.home.name, row.away.name]))].sort();', '  const teams = [...new Map(allEvents.flatMap(row => [row.home.name, row.away.name]).map(name => [newsTeamName(name), name])).values()].sort();')
s = s.replace('{ season }), [data, competition, season]', '{ season, range }), [data, competition, season, range]')
s = s.replace('{ view, season, group, team }), [data, competition, view, season, group, team]', '{ view, season, group, team, range }), [data, competition, view, season, group, team, range]')
s = s.replace("{ view: 'other', season, group, team }), [data, competition, season, group, team]", "{ view: 'other', season, group, team, range }), [data, competition, season, group, team, range]")
s = s.replace('  const showList = rows', '  const notice = newsDataNotice(data, view);\n  useEffect(() => setLogoFailed(false), [meta.logo]);\n  const showList = rows')
s = s.replace('  if (FOOTBALL_NEWS_TOPICS.has(competition))', """  function applyRange(event) {
    event.preventDefault();
    try { setRange(newsDateRange(dateFrom, dateTo)); setDateError(''); resetFilters(); }
    catch (error) { setDateError(error.message); }
  }
  function todayRange() {
    const today = localNewsDate(); setDateFrom(today); setDateTo(today);
    setRange(newsDateRange(today, today)); setDateError(''); resetFilters();
  }
  if (FOOTBALL_NEWS_TOPICS.has(competition))""")
s = s.replace('<header className="news-data-heading"><div>{meta.country_id', '<header className="news-data-heading"><div>{meta.logo && !logoFailed ? <img className="news-data-competition-logo" src={normalizeAssetUrl(meta.logo)} width="32" height="32" alt="" onError={() => setLogoFailed(true)} /> : null}{meta.country_id')
s = s.replace('seasons.length > 1 ?', 'seasons.length > 0 ?')
s = s.replace('<option value="">Current / available</option>', '<option value="">All available seasons</option>')
s = s.replace('    {loading ? <p role="status">', """    {view !== 'standings' ? <form className="news-data-dates" onSubmit={applyRange} aria-label="News match date range">
      <label>From<input aria-label="News matches from" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} required /></label>
      <label>To<input aria-label="News matches to" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} required /></label>
      <button className="btn btn-ghost" type="submit">Apply dates</button>
      <button className="btn btn-ghost" type="button" onClick={todayRange}>Today</button>
      {range ? <button className="btn btn-ghost" type="button" onClick={() => { setRange(null); setDateError(''); resetFilters(); }}>All available dates</button> : null}
      <p className="news-data-date-caption">{range ? `Selected: ${range.dateFrom} to ${range.dateTo}` : 'Showing all available match dates.'} Dates and kick-off times use your local timezone.</p>
    </form> : null}
    {dateError ? <p role="alert">{dateError}</p> : null}
    {notice ? <p className="news-data-notice" role="note">{notice}</p> : null}
    {season && view !== 'standings' ? <p className="news-data-note">Only records explicitly labelled with season {season} are included. Records without a confirmed season remain under All available seasons.</p> : null}
    {loading ? <p role="status">""")
s = s.replace("{data?.coverage?.truncated ? 'The available record window is limited. ' : ''}", '')
s = s.replace('        if (active && !controller.signal.aborted) {', "        if (data._newsRead?.partial && !(view === 'standings' ? data.rows : data.events)?.length\n            && saved?.data && (view === 'standings' ? saved.data.rows : saved.data.events)?.length)\n          throw new Error('Incomplete empty response cannot replace retained records');\n        if (active && !controller.signal.aborted) {")
p.write_text(s)
p = Path('src/pages/LeaguePage.jsx'); s = p.read_text(); s = s.replace('key={`${league.league}:${tab}`} competition={league.league}', 'key={league.league} competition={league.league}'); p.write_text(s)
p = Path('src/styles/newsFootballData.css'); p.write_text(p.read_text() + '''
.news-data-competition-logo{object-fit:contain;flex:0 0 32px}
.news-data-dates{display:flex;align-items:end;flex-wrap:wrap;gap:.65rem;margin:.5rem 0 1rem}
.news-data-dates label{display:flex;flex-direction:column;gap:.25rem;font-size:.85rem;min-width:130px;max-width:100%}
.news-data-dates input{box-sizing:border-box;width:100%;min-height:40px;border:1px solid var(--border,#cbd5e1);border-radius:8px;background:var(--ns-surface,#102844);color:var(--ns-text,#f5f8fd);padding:.4rem .6rem;color-scheme:dark;font:inherit}
.news-data-date-caption{flex-basis:100%;font-size:.8rem;margin:.2rem 0;color:var(--ns-text-secondary,#c5d4ea)}
.news-data-notice{padding:.65rem .85rem;border-inline-start:3px solid currentColor;font-size:.86rem;line-height:1.5;color:var(--ns-text-secondary,#c5d4ea)}
@media(max-width:520px){.news-data-dates{gap:.5rem}.news-data-dates label{flex:1 1 42%;min-width:0}.news-data-dates .btn{font-size:.8rem;min-height:40px}.news-data-competition-logo{width:26px;height:26px;flex-basis:26px}}
''')
p = Path('src/components/FootballNewsData.test.jsx'); p.write_text(p.read_text() + '''it('requests the chosen date window and keeps it when switching Fixtures and Results', async () => {
  api.getJSON.mockImplementation(async path => {
    if(path.includes('/events?')){const q=new URLSearchParams(path.split('?')[1]);return {sport:'football',competition:key,connected:true,
      snapshot:{complete:true,count:1,date_from:q.get('date_from'),date_to:q.get('date_to')},events:[game('dated')]};}
    return board();
  });
  const {rerender}=mount();await screen.findByRole('link',{name:'Open match: Arsenal vs Chelsea'});
  fireEvent.change(screen.getByLabelText('News matches from'),{target:{value:'2026-10-03'}});
  fireEvent.change(screen.getByLabelText('News matches to'),{target:{value:'2026-10-03'}});
  fireEvent.click(screen.getByRole('button',{name:'Apply dates'}));
  await waitFor(()=>expect(api.getJSON.mock.calls.some(c=>c[0].includes('/events?'))).toBe(true));
  await waitFor(()=>expect(screen.getByRole('link',{name:'Open match: Arsenal vs Chelsea'}).getAttribute('href')).toContain('dated'));
  rerender(<MemoryRouter><FootballNewsData competition={key} label="Premier League" view="fixtures" /></MemoryRouter>);
  expect(screen.getByText(/Selected: 2026-10-03 to 2026-10-03/)).toBeTruthy();
});
it('rejects reversed dates without requesting or erasing a successfully loaded result',async()=>{
  api.getJSON.mockResolvedValue(board());mount();await screen.findByRole('link',{name:'Open match: Arsenal vs Chelsea'});
  fireEvent.change(screen.getByLabelText('News matches from'),{target:{value:'2026-10-05'}});
  fireEvent.change(screen.getByLabelText('News matches to'),{target:{value:'2026-10-03'}});
  fireEvent.click(screen.getByRole('button',{name:'Apply dates'}));
  expect(screen.getByRole('alert').textContent).toContain('must not be before');
  expect(api.getJSON).toHaveBeenCalledTimes(1);expect(screen.getByRole('link',{name:'Open match: Arsenal vs Chelsea'})).toBeTruthy();
});
''')
