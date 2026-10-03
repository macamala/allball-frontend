from pathlib import Path
import shutil

for name in ['NewsRefreshBar.jsx','NewsRefreshBar.css','LeagueNewsPreview.jsx','NewsVisibility.test.jsx']:
    shutil.copyfile(Path('../bundle/audit') / name, Path('src/components') / name)

def edit(path, old, new):
    p=Path(path);s=p.read_text()
    assert s.count(old)==1,(path,s.count(old),old)
    p.write_text(s.replace(old,new))

edit('src/components/FootballNewsMenu.jsx','import "./FootballNewsMenu.css";', 'import "./FootballNewsMenu.css";\nimport LeagueNewsPreview from "./LeagueNewsPreview.jsx";\nimport NewsRefreshBar from "./NewsRefreshBar.jsx";')
edit('src/components/FootballNewsMenu.jsx','  const [query, setQuery]', '  const [revision, setRevision] = useState(0);\n  const [query, setQuery]')
edit('src/components/FootballNewsMenu.jsx','      <p>{t("news.leagueDirectoryBody")}</p>', '      <p>Browse leagues and their latest published NinkoSports stories. Each story stays with its own competition.</p>\n      <NewsRefreshBar onRefresh={() => { setRevision(value => value + 1); }} />')
edit('src/components/FootballNewsMenu.jsx','            <Link to={footballNewsPath(row)}>{row.label}<span aria-hidden="true"> →</span></Link>', '            <Link className="news-directory-league-link" to={footballNewsPath(row)}>{row.label}<span aria-hidden="true"> →</span></Link>\n            <LeagueNewsPreview league={row.league} revision={revision} />')
p=Path('src/components/FootballNewsMenu.css');p.write_text(p.read_text()+'''
.news-directory-preview{min-height:36px;margin-bottom:.8rem}
.news-league-countries .news-directory-story{display:grid;grid-template-columns:68px minmax(0,1fr);justify-content:start;align-items:start;gap:.6rem;padding:.65rem 0;min-height:0;text-decoration:none}
.news-directory-story img{width:68px;height:48px;object-fit:cover;border-radius:5px}
.news-directory-story span{min-width:0}.news-directory-story strong{display:block;font-size:.86rem;line-height:1.4;font-weight:600;overflow-wrap:anywhere}
.news-directory-story time{display:block;font-size:.75rem;margin-top:.35rem;color:var(--ns-text-secondary,#c5d4ea)}
.news-directory-story:not(:has(img)){grid-template-columns:1fr}
.news-directory-state{font-size:.8rem;line-height:1.4;color:var(--ns-text-secondary,#c5d4ea);margin:.25rem 0 .5rem}
.news-directory-state button{border:0;background:transparent;color:inherit;font:inherit;text-decoration:underline;cursor:pointer;min-height:32px}
.news-league-countries .news-directory-league-link{font-weight:700}
''')

edit('src/pages/LeaguePage.jsx','import { leagueNewsRows }', 'import NewsRefreshBar from "../components/NewsRefreshBar.jsx";\nimport { leagueNewsRows }')
edit('src/pages/LeaguePage.jsx','  const [tab, setTab]', '  const [refreshTick, setRefreshTick] = useState(0);\n  const [checkedAt, setCheckedAt] = useState(null);\n  const [newsQuery, setNewsQuery] = useState("");\n  const loadedPages = useRef(1);\n  const firstRead = useRef(true);\n  const [tab, setTab]')
edit('src/pages/LeaguePage.jsx','    } else {\n      setLoading(true);\n    }\n    getArticles', '    } else if (firstRead.current) {\n      setLoading(true);\n    }\n    firstRead.current = false;\n    getArticles')
edit('src/pages/LeaguePage.jsx','    if (cached.length) {','    if (cached.length && firstRead.current) {')
edit('src/pages/LeaguePage.jsx','          setArticles(forLeague(rows));', '          if (!Array.isArray(rows)) throw new Error("Invalid News response");\n          const fresh = forLeague(rows);\n          setArticles(previous => loadedPages.current > 1\n            ? publishedNewsRows([...new Map([...fresh, ...previous.slice(80)].map(row => [row.id || row.slug, row])).values()]) : fresh);\n          setCheckedAt(new Date().toISOString());')
edit('src/pages/LeaguePage.jsx','[league.catchAll, league.league, sportSlug, directory]);','[league.catchAll, league.league, sportSlug, directory, refreshTick]);')
edit('src/pages/LeaguePage.jsx','      setNextOffset((offset) => offset + 80);','      loadedPages.current += 1;\n      setNextOffset((offset) => offset + 80);')
edit('src/pages/LeaguePage.jsx','  const isolated = articles.filter(isPremiumArticle);','  const normalizeSearch = value => String(value || "").normalize("NFKD").replace(/\\p{M}/gu, "").toLowerCase();\n  const needle = normalizeSearch(newsQuery).trim();\n  const approved = articles.filter(isPremiumArticle);\n  const isolated = approved.filter(row => !needle || normalizeSearch(`${row.title || ""} ${row.summary || ""}`).includes(needle));')
edit('src/pages/LeaguePage.jsx','        <>\n          <p><Link', '        <>\n          <NewsRefreshBar enabled={tab === "news"} busy={loading || loadingMore} checkedAt={checkedAt} onRefresh={() => setRefreshTick(value => value + 1)} />\n          <div className="news-league-search">\n            <label htmlFor="league-story-search">Search this league’s published news</label>\n            <input id="league-story-search" type="search" placeholder="Club, player or headline" value={newsQuery} onChange={event => setNewsQuery(event.target.value)} />\n            <p>{isolated.length} {hasMore ? "loaded " : ""}published {isolated.length === 1 ? "story" : "stories"}{needle ? ` matching “${newsQuery}”` : ""}.</p>\n          </div>\n          <p><Link')
edit('src/pages/LeaguePage.jsx','title={t("empty.competitionNone", { competition: league.label })}', 'title={needle ? "No published story matches this search" : t("empty.competitionNone", { competition: league.label })}')
edit('src/pages/LeaguePage.jsx','body={t("empty.competitionNoneBody")}', 'body={needle ? "Try a club name, player surname or another headline term." : t("empty.competitionNoneBody")}')

edit('src/pages/SportPage.jsx','import NotFoundPage', 'import NewsRefreshBar from "../components/NewsRefreshBar.jsx";\nimport NotFoundPage')
edit('src/pages/SportPage.jsx','  const [articles, setArticles]', '  const [refreshTick, setRefreshTick] = useState(0);\n  const [checkedAt, setCheckedAt] = useState(null);\n  const [articles, setArticles]')
edit('src/pages/SportPage.jsx','          setArticles(publishedNewsRows(rows));','          if (!Array.isArray(rows)) throw new Error("Invalid News response");\n          setArticles(publishedNewsRows(rows));\n          setCheckedAt(new Date().toISOString());')
edit('src/pages/SportPage.jsx','  }, [apiSport, sport, t]);', '  }, [apiSport, sport, t, refreshTick]);')
edit('src/pages/SportPage.jsx','      <p><Link className="btn btn-ghost" to={`/search?', '      {apiSport === "football" && <NewsRefreshBar checkedAt={checkedAt} busy={loading} onRefresh={() => setRefreshTick(value => value + 1)} />}\n      <p><Link className="btn btn-ghost" to={`/search?')
edit('src/pages/SportPage.jsx','    } else {\n      setLoading(true);','    } else if (!refreshTick) {\n      setLoading(true);')

edit('src/pages/HomePage.jsx','import BreakingBar', 'import NewsRefreshBar from "../components/NewsRefreshBar.jsx";\nimport BreakingBar')
edit('src/pages/HomePage.jsx','  const [data, setData]', '  const [refreshTick, setRefreshTick] = useState(0);\n  const [checkedAt, setCheckedAt] = useState(null);\n  const [data, setData]')
edit('src/pages/HomePage.jsx','    } else {\n      setLoading(true);','    } else if (!refreshTick) {\n      setLoading(true);')
edit('src/pages/HomePage.jsx','          setData(preparePortalHomeNews(payload));','          if (!payload || !Array.isArray(payload.featured) || !Array.isArray(payload.latest)) throw new Error("Invalid News response");\n          setData(preparePortalHomeNews(payload));\n          setCheckedAt(new Date().toISOString());')
edit('src/pages/HomePage.jsx','    };\n  }, [t]);\n\n  const sportOrder', '    };\n  }, [t, refreshTick]);\n\n  const sportOrder')
edit('src/pages/HomePage.jsx','  if (error) {\n    return <EmptyState title={t("empty.loadFail")} body={error} compact />;', '  if (error && !data) {\n    return <><NewsRefreshBar onRefresh={() => setRefreshTick(value => value + 1)} /><EmptyState title={t("empty.loadFail")} body={error} compact /></>;')
edit('src/pages/HomePage.jsx','      <BreakingBar articles={modules.breaking} />','      <NewsRefreshBar checkedAt={checkedAt} busy={loading} onRefresh={() => setRefreshTick(value => value + 1)} />\n      {error ? <p role="alert">News could not be refreshed. Showing the last successfully loaded stories.</p> : null}\n      <BreakingBar articles={modules.breaking} />')
p=Path('src/pages/LeaguePage.news.test.jsx');p.write_text(p.read_text()+'''
it('refreshes the current league and permits searching already published club stories',async()=>{
  api.getArticles.mockResolvedValueOnce([article(1,'serbia-superliga','Vojvodina appoints manager'),article(2,'serbia-superliga','Partizan prepares for match')])
    .mockResolvedValueOnce([article(3,'serbia-superliga','Cukaricki announces squad'),article(1,'serbia-superliga','Vojvodina appoints manager')]);
  page('/football/superliga');await screen.findByText('Vojvodina appoints manager');
  fireEvent.change(screen.getByLabelText('Search this league’s published news'),{target:{value:'Vojvodina'}});
  expect(screen.queryByText('Partizan prepares for match')).toBeNull();
  fireEvent.change(screen.getByLabelText('Search this league’s published news'),{target:{value:''}});
  fireEvent.click(screen.getByRole('button',{name:'Refresh news'}));
  await screen.findByText('Cukaricki announces squad');
  expect(api.getArticles).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Partizan prepares for match')).toBeNull();
});
it('does not erase visible published news when its refresh fails',async()=>{
  api.getArticles.mockResolvedValueOnce([article(1,'serbia-superliga','Vojvodina appoints manager')]).mockRejectedValueOnce(new Error('offline'));
  page('/football/superliga');await screen.findByText('Vojvodina appoints manager');
  fireEvent.click(screen.getByRole('button',{name:'Refresh news'}));
  await waitFor(()=>expect(api.getArticles).toHaveBeenCalledTimes(2));
  expect(screen.getByText('Vojvodina appoints manager')).toBeTruthy();
});
''')
