from pathlib import Path
import json,shutil
bundle=Path('../bundle/audit/fill')
for name in ['newsFootballSupplement.js','newsFootballSupplement.test.js','newsFixtureSupplement.js','newsFixtureSupplement.test.js','newsOfficialData.js','newsOfficialData.test.js']:
    shutil.copyfile(bundle/name,Path('src/lib')/name)
Path('server').mkdir(exist_ok=True)
for name in ['newsDataServer.cjs','newsPrva.cjs']:
    shutil.copyfile(bundle/name,Path('server')/name)
Path('tests').mkdir(exist_ok=True)
shutil.copyfile(bundle/'newsDataServer.check.cjs','tests/newsDataServer.check.cjs')
def edit(path,old,new):
    p=Path(path);s=p.read_text();assert s.count(old)==1,(path,s.count(old),old);p.write_text(s.replace(old,new))
edit('src/lib/newsFootballData.js','sameNewsSeason, newsTeamName','sameNewsSeason, newsTeamName, localNewsDate')
edit('src/lib/newsFootballData.js',"  const status = String(event?.status || '').toLowerCase();", "  const status = String(event?.status || '').toLowerCase();\n  if (event?.start_precision === 'DATE_ONLY' && /^\\d{4}-\\d{2}-\\d{2}$/.test(event.source_date || '') && SCHEDULED.has(status)) return event.source_date >= localNewsDate(new Date(now)) ? 'fixtures' : 'other';")
edit('src/lib/newsFootballData.js','    if (range && (Date.parse(event.start_time) < range.start || Date.parse(event.start_time) >= range.end)) continue;',"    if (range && (event.start_precision === 'DATE_ONLY' && event.source_date ? (event.source_date < range.dateFrom || event.source_date > range.dateTo) : (Date.parse(event.start_time) < range.start || Date.parse(event.start_time) >= range.end))) continue;")
edit('src/lib/newsFootballData.js','export async function readNewsData(','export async function readRetainedNewsData(')
p=Path('src/lib/newsFootballData.js');p.write_text(p.read_text()+'''
/** NEWS-only fallback. Keep fresh retained data; never replace it with guesses. */
export async function readNewsData(get, competition, view, options = {}) {
  let saved = null, failed;
  try { saved = await readRetainedNewsData(get, competition, view, options); }
  catch (error) { if (options.signal?.aborted) throw error; failed = error; }
  const missing = !(view === 'standings' ? saved?.rows : saved?.events)?.length;
  if (typeof options.supplement === 'function' && (missing || (view === 'standings' && saved?.stale))) {
    try {
      const extra = await options.supplement(competition, view, options);
      if (extra) {
        if (!scopedNewsData(extra, competition) || (options.season && !sameNewsSeason(options.season, extra.season)))
          throw new Error('Unverified supplemental News scope');
        if ((view === 'standings' ? extra.rows : extra.events)?.length) return extra;
      }
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (missing) throw error;
      return { ...saved, stale: true, _newsRead: { ...saved._newsRead, supplementUnavailable: true } };
    }
  }
  if (saved) return saved;
  throw failed || new Error('Competition data is unavailable');
}
''')
p=Path('src/components/FootballNewsData.jsx');p.write_text("import { loadNewsSupplement } from '../lib/newsFootballSupplement.js';\n"+p.read_text())
edit(str(p),"range: view === 'standings' ? null : range, signal: controller.signal }","range: view === 'standings' ? null : range, signal: controller.signal, supplement: loadNewsSupplement }")
edit(str(p),'  const at = new Date(event.start_time), bucket',"  const displayDate = event.start_precision === 'DATE_ONLY' && event.source_date ? new Date(...event.source_date.split('-').map((v,i)=>Number(v)-(i===1?1:0))) : new Date(event.start_time);\n  const at = new Date(event.start_time), bucket")
edit(str(p),"{at.toLocaleDateString('en-GB'","{displayDate.toLocaleDateString('en-GB'")
edit(str(p),'    {notice ? <p', '''    {data?._newsRead?.edition ? <p className="news-data-note">Tournament edition: {data.season}. {data._newsRead.currentEditionUnavailable ? 'The current edition is unavailable; showing the verified previous edition. ' : ''}{view === 'standings' ? 'Group-stage standings for this edition; not a live knockout bracket.' : 'Fixtures and results reported for this edition.'}</p> : null}
    {data?.table_status === 'provisional' ? <p className="news-data-note">Provisional official standings · Season {data.season}</p> : null}
    {notice ? <p''')
edit(str(p),'<StandingsTable key=','<StandingsTable teamLinks={!data?._newsRead?.supplementary} key=')
edit('src/components/StandingsTable.jsx','function TeamCell({ row, sport, competition, competitionCountry })','function TeamCell({ row, sport, competition, competitionCountry, teamLinks = true })')
edit('src/components/StandingsTable.jsx','  return path && path !== "/live-scores" ? (','  return teamLinks && path && path !== "/live-scores" ? (')
edit('src/components/StandingsTable.jsx','  strictGroup = false,','  strictGroup = false,\n  teamLinks = true,')
edit('src/components/StandingsTable.jsx','                      row={row}','                      row={row}\n                      teamLinks={teamLinks}')
Path('src/components/StandingsTable.news-supplement.test.jsx').write_text('''import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {it,expect,afterEach,vi} from 'vitest';
import StandingsTable from './StandingsTable.jsx';
vi.mock('../context/I18nContext.jsx',()=>({useI18n:()=>({lang:'en'})}));
afterEach(cleanup);
const rows=[{rank:1,team:'Club A',team_id:'news-source:123',played:1,points:3,logo:'https://images.example/123.png'}];
it('News-only supplemental identities do not link to nonexistent internal profiles',()=>{
 render(<MemoryRouter><StandingsTable rows={rows} sport="football" competition="serbia-prva-liga" teamLinks={false}/></MemoryRouter>);
 expect(screen.getByText('Club A')).toBeTruthy();expect(screen.queryAllByRole('link')).toHaveLength(0);expect(screen.getByRole('table').querySelector('img').src).toBe(rows[0].logo);
});
it('existing callers keep team-profile links by default',()=>{
 render(<MemoryRouter><StandingsTable rows={rows} sport="football" competition="serbia-prva-liga"/></MemoryRouter>);
 expect(screen.getByRole('link',{name:'Club A'}).getAttribute('href')).toContain('/teams/');
});
''')
p=Path('package.json');d=json.loads(p.read_text());d['scripts']['start']='npm run build && node server/newsDataServer.cjs';d['scripts']['test:news-data']='node --test tests/newsDataServer.check.cjs'
# Promote exact already-locked dependencies. No package upgrade or new service.
deps={'serve-handler':'6.1.7','parse5':'7.3.0','compression':'1.8.1'};d['dependencies'].update(deps);p.write_text(json.dumps(d,indent=2)+'\n')
p=Path('package-lock.json');d=json.loads(p.read_text());d['packages']['']['dependencies'].update(deps)
for name in ['node_modules/parse5','node_modules/entities']:d['packages'][name].pop('dev',None)
p.write_text(json.dumps(d,indent=2)+'\n')
