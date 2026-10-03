from pathlib import Path
import shutil
root=Path('.')
bundle=Path('../bundle/audit')
shutil.copyfile(bundle/'newsHns.cjs','server/newsHns.cjs')
shutil.copyfile(bundle/'newsHns.check.cjs','tests/newsHns.check.cjs')
shutil.copyfile(bundle/'newsHnsData.test.js','src/lib/newsHnsData.test.js')
def edit(name,old,new):
 p=root/name;s=p.read_text();assert s.count(old)==1,(name,s.count(old),old);p.write_text(s.replace(old,new))
edit('server/newsRegionalTransport.cjs',"'Accept':'text/html,text/plain;q=0.9'","'Accept':json?'application/json':'text/html,text/plain;q=0.9'")
edit('server/newsRegional.cjs',"const {parse}=require('parse5');","const {parse}=require('parse5');\nconst {parseHns}=require('./newsHns.cjs');")
edit('server/newsRegional.cjs',"const SOURCES=Object.freeze({","const SOURCES=Object.freeze({\n 'croatia-prva-nl':{origin:'https://semafor.hns.family',path:'/',name:'SuperSport Prva NL',country:'hr',count:16,parser:'hns',source:'official-hns'},")
old=" const m=/^https:\\/\\/www\\.2liga\\.at\\/de\\/tabelle\\/saison-(20\\d{2})-(20\\d{2})$/.exec(canonical);must(m);const selected=season(`${m[1]}/${m[2]}`,now);"
new=""" const m=/^https:\\/\\/www\\.2liga\\.at\\/de\\/tabelle(?:\\/saison-(20\\d{2})-(20\\d{2}))?$/.exec(canonical);must(m);
 const selectedButton=nodes(doc,n=>n.tagName==='button'&&/^20\\d{2}\\s*\\/\\s*20\\d{2}$/.test(text(n)));
 const selected=m[1]?season(`${m[1]}/${m[2]}`,now):season(text(one(selectedButton)),now);
 if(selectedButton.length)must(selectedButton.every(n=>text(n).replace(/\\s/g,'')===selected),'SOURCE_SEASON');"""
edit('server/newsRegional.cjs',old,new)
edit('server/newsRegional.cjs',"const result=spec.parser==='korea'?korea(html,spec,now):PARSERS[spec.parser](parse(html),spec,now);", "const result=spec.parser==='hns'?parseHns(html,now):spec.parser==='korea'?korea(html,spec,now):PARSERS[spec.parser](parse(html),spec,now);")
edit('server/newsRegional.cjs',"sport:'football',season:result.season,seasons:[result.season],rows,available:true", "sport:'football',season:result.season,seasons:[result.season],rows,...(result.events?{events:result.events,teams:result.teams}:{}),available:true")
edit('server/newsRegionalTransport.cjs',"const {SOURCES,parseRegionalTable}=require('./newsRegional.cjs');", "const {SOURCES,parseRegionalTable}=require('./newsRegional.cjs');\nconst {selectHnsURL}=require('./newsHns.cjs');")
edit('server/newsRegionalTransport.cjs'," if(s.parser==='korea')", " if(s.parser==='hns')return (u.pathname==='/'||/^\\/natjecanja\\/\\d+\\/supersport-prva-nl\\/$/.test(u.pathname))&&!u.search;\n if(s.parser==='korea')")
edit('server/newsRegionalTransport.cjs',"    const raw=await readText(fetcher,key,origin+sourcePath,{permit,json:spec.format==='json',method:spec.parser==='korea'?'POST':'GET'});", """    let raw=await readText(fetcher,key,origin+sourcePath,{permit,json:spec.format==='json',method:spec.parser==='korea'?'POST':'GET'});
    if(spec.parser==='hns'){
     stage='discovery';const url=selectHnsURL(raw.text);
     if(!permit(new URL(url).pathname))throw fail('SOURCE_POLICY');
     const wait=Math.max(0,policy.delay-(clock()-(lastRead.get(origin)||0)));if(wait)await sleep(wait);
     stage='fetch';lastRead.set(origin,clock());raw=await readText(fetcher,key,url,{permit});
    }""")
edit('server/newsDataServer.cjs',"(match[2]==='matches'&&match[1]!=='serbia-prva-liga')", "(match[2]==='matches'&&!['serbia-prva-liga','croatia-prva-nl'].includes(match[1]))")
edit('src/lib/newsOfficialData.js',"export const REGIONAL_NEWS_TABLES=Object.freeze({", "export const REGIONAL_NEWS_TABLES=Object.freeze({\n 'croatia-prva-nl':{count:16,sources:['official-hns'],matches:240},")
edit('src/lib/newsOfficialData.js',"(view!=='standings'&&competition!=='serbia-prva-liga')", "(view!=='standings'&&!['serbia-prva-liga','croatia-prva-nl'].includes(competition))")
edit('src/lib/newsOfficialData.js',"d.source!=='official-prva-liga'||d.events.length!==240", "!(competition==='croatia-prva-nl'?d.source==='official-hns':d.source==='official-prva-liga')||d.events.length!==240")
edit('src/lib/newsFootballData.js',"  if (FINALS.has(status))", "  if (status === 'reported_result' && event?.source === 'official-hns' && event?.competition_key === 'croatia-prva-nl') return 'results';\n  if (FINALS.has(status))")
edit('src/components/FootballNewsData.jsx',"const label = bucket === 'results' ? 'FT'", "const label = bucket === 'results' ? (event.status === 'reported_result' ? 'Reported result' : 'FT')")
p=root/'tests/newsRegional.check.cjs';s=p.read_text().replace('Object.keys(SOURCES)',"Object.keys(SOURCES).filter(k=>k!=='croatia-prva-nl')")
s=s.replace("assert.equal(calls[1].o.body,'');", "assert.equal(calls[1].o.body,'');assert.equal(calls[1].o.headers.Accept,'application/json');")
s+="""\ntest('current Austrian generic table route must declare its season selector',()=>{
 const html=fixture('austria-second-league').replace('/saison-2026-2027','');
 assert.equal(parseRegionalTable(html+'<button>2026 / 2027</button>','austria-second-league',NOW).season,'2026/2027');
 assert.throws(()=>parseRegionalTable(html,'austria-second-league',NOW));
 assert.throws(()=>parseRegionalTable(html+'<button>2025 / 2026</button>','austria-second-league',NOW));
 assert.throws(()=>parseRegionalTable(fixture('austria-second-league')+'<button>2025 / 2026</button>','austria-second-league',NOW));
});\n"""
p.write_text(s)
p=root/'src/lib/newsRegionalData.test.js';s=p.read_text().replace('Object.keys(REGIONAL_NEWS_TABLES)',"Object.keys(REGIONAL_NEWS_TABLES).filter(k=>k!=='croatia-prva-nl')");p.write_text(s)
p=root/'src/App.test.jsx';s=p.read_text();old='''      expect(stored.sports).toEqual([]);
    });
    expect(screen.queryByText("Currently following")).not.toBeInTheDocument();''';new='''      expect(stored.sports).toEqual([]);
      expect(screen.queryByText("Currently following")).not.toBeInTheDocument();
    });''';assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
p=root/'src/components/FootballNewsData.test.jsx';p.write_text(p.read_text()+'''it('labels a federation-reported score without inventing FT or opening a non-existent Match Centre',async()=>{
 const league='croatia-prva-nl';
 api.getJSON.mockResolvedValue(board({competition:{id:league,sport:'football'},events:[game('hns-score','reported_result',{competition_key:league,source:'official-hns',details_available:false})]}));
 mount({competition:league,label:'Prva NL'});
 expect(await screen.findByText('Reported result')).toBeTruthy();
 expect(screen.queryByText('FT')).toBeNull();
 expect(screen.queryByRole('link',{name:'Open match: Arsenal vs Chelsea'})).toBeNull();
});
''')
