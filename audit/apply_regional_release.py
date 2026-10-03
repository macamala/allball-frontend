from pathlib import Path
import shutil
bundle=Path('../bundle/audit')
for name in ['newsRegional.cjs','newsRegionalTransport.cjs']:
    shutil.copyfile(bundle/name,Path('server')/name)
shutil.copyfile(bundle/'newsRegional.check.cjs','tests/newsRegional.check.cjs')
shutil.copyfile(bundle/'newsRegionalData.test.js','src/lib/newsRegionalData.test.js')
p=Path('server/newsRegional.cjs');s=p.read_text()
s=s.replace("const SOURCES=Object.freeze({", "const SOURCES=Object.freeze({\n 'south-korea-k-league-2':{origin:'https://www.kleague.com',path:'/record/teamRank.do',name:'K League 2',country:'kr',count:17,parser:'korea',source:'official-kleague',format:'json'},")
start=s.index('function parseRegionalTable(')
s=s[:start]+'''function korea(raw,spec,now){
 const obj=JSON.parse(raw),data=obj?.data,year=new Date(now).getUTCFullYear();
 must(obj?.resultCode==='200'&&data?.year===year&&data.isSplitRank===false,'SOURCE_IDENTITY');
 must(Array.isArray(data.teamRank)&&Array.isArray(data.teamNameList)&&Array.isArray(data.teamNameShortList),'SOURCE_STRUCTURE');
 const n=data.teamRank.length;must(n>=14&&n<=24&&data.teamNameList.length===n&&data.teamNameShortList.length===n,'INCOMPLETE_TABLE');
 if(year===2026)must(n===17,'INCOMPLETE_TABLE');
 const rows=data.teamRank.map((r,i)=>{
  must(r.year===year&&r.leagueId===2&&r.stadium==='all'&&/^K[0-9]{2}$/.test(r.teamId)&&typeof r.teamName==='string'&&r.teamName,'SOURCE_IDENTITY');
  must(data.teamNameShortList[i]?.rank===r.rank&&data.teamNameShortList[i]?.teamName===r.teamName&&typeof data.teamNameList[i]==='string'&&data.teamNameList[i].trim(),'SOURCE_IDENTITY');
  const values=[r.gameCount,r.winCnt,r.tieCnt,r.lossCnt,r.gainGoal,r.lossGoal,r.gapCnt,r.gainPoint];
  must(values.every(Number.isInteger),'INVALID_STATISTIC');
  return {rank:r.rank,team:data.teamNameList[i],team_id:'news-kleague:'+r.teamId,logo:spec.origin+'/assets/images/emblem/emblem_'+r.teamId+'.png',...stats(values.map(String))};
 });
 return {season:String(year),rows:complete(rows,{...spec,count:n})};
}
'''+s[start:]
s=s.replace("const result=PARSERS[spec.parser](parse(html),spec,now);", "const result=spec.parser==='korea'?korea(html,spec,now):PARSERS[spec.parser](parse(html),spec,now);")
p.write_text(s)
p=Path('server/newsRegionalTransport.cjs');s=p.read_text()
s=s.replace(" if(s.parser==='czech')", " if(s.parser==='korea')return u.pathname==='/record/teamRank.do'&&/^\\?leagueId=2&year=20[0-9]{2}&stadium=all&recordType=rank$/.test(u.search);\n if(s.parser==='czech')")
s=s.replace("{limit=4000000,robots=false,permit=()=>true}", "{limit=4000000,robots=false,permit=()=>true,json=false,method='GET'}")
s=s.replace("{method:'GET',headers:","{method, ...(method==='POST'?{body:''}:{}),headers:")
s=s.replace("!/^text\\/(?:html|plain)(?:\\s*;|$)/i.test(type)", "!(json ? /^application\\/json(?:\\s*;|$)/i.test(type) : /^text\\/(?:html|plain)(?:\\s*;|$)/i.test(type))")
s=s.replace("stage='policy';const permit=target=>robotAllows(policy.text,target);\n    if(!permit(spec.path))", "stage='policy';const permit=target=>robotAllows(policy.text,target);\n    const sourcePath=spec.parser==='korea'?spec.path+'?leagueId=2&year='+new Date(clock()).getUTCFullYear()+'&stadium=all&recordType=rank':spec.path;\n    if(!permit(sourcePath))")
s=s.replace("origin+spec.path,{permit}", "origin+sourcePath,{permit,json:spec.format==='json',method:spec.parser==='korea'?'POST':'GET'}")
p.write_text(s)
def edit(name,old,new):
    p=Path(name);s=p.read_text();assert s.count(old)==1,(name,s.count(old),old);p.write_text(s.replace(old,new))
edit('server/newsDataServer.cjs',"const AGENT=", "const {regionalLoader}=require('./newsRegionalTransport.cjs');\nconst {SOURCES}=require('./newsRegional.cjs');\nconst AGENT=")
edit('server/newsDataServer.cjs',"loader=officialLoader()}={}","loader=officialLoader(),regional=regionalLoader({robotAllows})}={}")
edit('server/newsDataServer.cjs',"const match=/^\\/news-data\\/football\\/serbia-prva-liga\\/(standings|matches)$/.exec(req.url);", "const match=/^\\/news-data\\/football\\/([a-z0-9-]+)\\/(standings|matches)$/.exec(req.url);")
edit('server/newsDataServer.cjs',"if(!match){res.statusCode=404", "if(!match||!Object.hasOwn(SOURCES,match[1])||(match[2]==='matches'&&match[1]!=='serbia-prva-liga')){res.statusCode=404")
edit('server/newsDataServer.cjs',"try{const data=await loader(match[1]);res.statusCode=200;", """try{
    const key=match[1],view=match[2];let data;
    if(key==='serbia-prva-liga'){
     try{data=await loader(view);}catch(error){if(view!=='standings')throw error;data=await regional(key);}
    }else data=await regional(key);
    res.statusCode=200;""")
edit('src/lib/newsOfficialData.js','const cache=new Map();',"""export const REGIONAL_NEWS_TABLES=Object.freeze({
 'serbia-prva-liga':{count:16,sources:['official-prva-liga','srbijasport-prva']},
 'czech-second-league':{count:16,sources:['official-chnliga']},
 'austria-second-league':{count:16,sources:['official-oefbl']},
 'turkey-first-league':{count:20,sources:['official-tff']},
 'south-korea-k-league-2':{min:14,max:24,sources:['official-kleague']},
});
const cache=new Map();""")
edit('src/lib/newsOfficialData.js',"if(competition!=='serbia-prva-liga'||!['fixtures','results','standings'].includes(view))return null;", "if(!Object.hasOwn(REGIONAL_NEWS_TABLES,competition)||!['fixtures','results','standings'].includes(view)||(view!=='standings'&&competition!=='serbia-prva-liga'))return null;\n const spec=REGIONAL_NEWS_TABLES[competition];")
edit('src/lib/newsOfficialData.js',"url='/news-data/football/serbia-prva-liga/'+type", "url='/news-data/football/'+competition+'/'+type")
p=Path('src/lib/newsOfficialData.js');s=p.read_text().replace('cache.get(type)','cache.get(url)').replace('cache.set(type,','cache.set(url,')
s=s.replace("d.source!=='official-prva-liga'", "!spec.sources.includes(d.source)")
s=s.replace("type==='standings'&&d.rows.length!==16", "type==='standings'&&((spec.count&&d.rows.length!==spec.count)||(!spec.count&&(d.rows.length<spec.min||d.rows.length>spec.max)))")
s=s.replace("type==='matches'&&(d.events.length!==240", "type==='matches'&&(d.source!=='official-prva-liga'||d.events.length!==240")
p.write_text(s)
edit('src/lib/newsFootballSupplement.js',"import {loadOfficialNewsData}","import {loadOfficialNewsData,REGIONAL_NEWS_TABLES}")
p=Path('src/lib/newsFootballSupplement.js');s=p.read_text();assert "competition==='serbia-prva-liga'" in s;s=s.replace("competition==='serbia-prva-liga'", "Object.hasOwn(REGIONAL_NEWS_TABLES,competition)");p.write_text(s)
