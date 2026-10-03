'use strict';
/** Read-only, publisher-reported NEWS tables. Never computes a league table from match fragments. */
const {parse}=require('parse5');
const SOURCES=Object.freeze({
 'czech-second-league':{origin:'https://www.chnliga.cz',path:'/tabulka',name:'Chance Národní Liga',country:'cz',count:16,parser:'czech',source:'official-chnliga'},
 'austria-second-league':{origin:'https://www.2liga.at',path:'/tabelle',name:'2. Liga',country:'at',count:16,parser:'austria',source:'official-oefbl'},
 'turkey-first-league':{origin:'https://www.tff.org',path:'/default.aspx?pageID=142',name:'Trendyol 1. Lig',country:'tr',count:20,parser:'turkey',source:'official-tff'},
 'serbia-prva-liga':{origin:'https://srbijasport.net',path:'/league/8626-mozzart-bet-prva-liga-srbije/table',name:'Prva liga Srbije',country:'rs',count:16,parser:'serbia',source:'srbijasport-prva'}
});
const must=(condition,code='SOURCE_IDENTITY')=>{if(!condition)throw Object.assign(Error('Unverified regional News data'),{code});};
const attr=(n,key)=>(n?.attrs||[]).find(a=>a.name===key)?.value||'';
const cls=(n,key)=>attr(n,'class').split(/\s+/).includes(key);
function nodes(root,test){const out=[];function visit(n){if(test(n))out.push(n);for(const c of n.childNodes||[])visit(c);}visit(root);return out;}
const byClass=(root,c)=>nodes(root,n=>cls(n,c));
function one(list){must(list.length===1,'SOURCE_STRUCTURE');return list[0];}
function text(n){if(['script','style'].includes(n?.tagName))return '';return (n?.nodeName==='#text'?n.value:(n?.childNodes||[]).map(text).join(' ')).replace(/\s+/g,' ').trim();}
const cells=n=>(n.childNodes||[]).filter(c=>['td','th'].includes(c.tagName));
const int=(value,signed=false)=>{const s=typeof value==='string'?value:text(value);must((signed?/^[+-]?\d+$/:/^\d+$/).test(s),'INVALID_STATISTIC');const x=Number(s);must(Number.isSafeInteger(x),'INVALID_STATISTIC');return x;};
function season(value,now){const m=/^(20\d{2})\s*[-/]\s*(20\d{2})$/.exec(value);must(m&&+m[2]===+m[1]+1,'SOURCE_SEASON');must(Number.isFinite(now)&&now>=Date.UTC(+m[1],6,1)&&now<Date.UTC(+m[2],7,1),'SOURCE_SEASON');return `${m[1]}/${m[2]}`;}
function stats(v){must(v.length===8,'INVALID_STATISTIC');const [played,wins,draws,losses,gf,ga,gd,points]=v.map((x,i)=>int(x,i>=6));must(played===wins+draws+losses&&gd===gf-ga,'INCONSISTENT_STATISTICS');return {played,wins,draws,losses,goals_for:gf,goals_against:ga,goal_difference:gd,points};}
function image(raw,origin,pattern){try{const u=new URL(raw,origin);must(u.origin===origin&&!u.username&&!u.password&&pattern.test(u.pathname),'IMAGE_IDENTITY');return u.href;}catch{throw Object.assign(Error('Unverified regional News image'),{code:'IMAGE_IDENTITY'});}}
function complete(rows,spec){must(rows.length===spec.count,'INCOMPLETE_TABLE');must(new Set(rows.map(r=>r.team_id)).size===rows.length&&new Set(rows.map(r=>r.rank)).size===rows.length,'DUPLICATE_TEAM_OR_RANK');must(rows.every(r=>r.rank>=1&&r.rank<=rows.length&&r.team&&!r.team.includes('\uFFFD')),'INVALID_TEAM');return rows;}
function czech(doc,spec,now){
 must(text(one(nodes(doc,n=>n.tagName==='title')))==='Tabulka | Chance Národní Liga');
 const option=one(nodes(one(nodes(doc,n=>n.tagName==='select'&&attr(n,'id')==='id_season')),n=>n.tagName==='option'&&n.attrs?.some(a=>a.name==='selected')));
 const selected=season(text(option),now),year=selected.split('/')[0];must(attr(option,'value')===`/tabulka/${year}`);
 const table=one(byClass(doc,'standings__table'));must(JSON.stringify(nodes(table,n=>n.tagName==='th').map(text))===JSON.stringify(['#','','Klub','Z','V','R','P','G+','G-','RG','B','']),'TABLE_COLUMNS');
 const rows=[];
 for(const tr of nodes(table,n=>n.tagName==='tr')){
  const c=cells(tr);if(!c.some(x=>cls(x,'order')))continue;must(c.length===12,'TABLE_COLUMNS');
  const anchor=one(nodes(c[2],n=>n.tagName==='a')),pic=one(nodes(c[2],n=>n.tagName==='img'));
  const id=new RegExp(`^/tymy/${year}/(\\d+)-[^/]+$`).exec(attr(anchor,'href'));must(id);must(attr(pic,'alt')===text(anchor));
  rows.push({rank:int(c[0]),team:text(anchor),team_id:'news-chn:'+id[1],logo:image(attr(pic,'src'),spec.origin,new RegExp(`^/photo/team/team_${id[1]}\\.png$`)),...stats(c.slice(3,11))});
 }
 return {rows:complete(rows,spec),season:selected};
}
function hidden(table){for(let n=table.parentNode;n;n=n.parentNode)if(cls(n,'hidden')||n.attrs?.some(a=>a.name==='hidden'))return true;return false;}
function austria(doc,spec,now){
 const canonical=attr(one(nodes(doc,n=>n.tagName==='link'&&attr(n,'rel')==='canonical')),'href');
 const m=/^https:\/\/www\.2liga\.at\/de\/tabelle\/saison-(20\d{2})-(20\d{2})$/.exec(canonical);must(m);const selected=season(`${m[1]}/${m[2]}`,now);
 must(nodes(doc,n=>n.tagName==='h1').some(n=>text(n)==='ADMIRAL 2. Liga Tabelle'));
 const tables=nodes(doc,n=>n.tagName==='table'&&nodes(n,x=>x.tagName==='th').some(x=>text(x)==='Spiele'));
 const table=one(tables.filter(t=>!hidden(t)));must(JSON.stringify(nodes(table,n=>n.tagName==='th').map(text))===JSON.stringify(['PL','Tendenz','','Klub','Spiele','S','U','N','Tore','GT','TD','Punkte','','','']),'TABLE_COLUMNS');
 const rows=[];
 for(const tr of nodes(table,n=>n.tagName==='tr')){
  const c=cells(tr);if(c[0]?.tagName!=='td')continue;must(c.length===15,'TABLE_COLUMNS');
  const pic=one(nodes(c[2],n=>n.tagName==='img')),a=one(nodes(c[2],n=>n.tagName==='a'));
  const id=/^\/team\/[^/]+\/(\d+)$/.exec(attr(a,'href'));must(id);
  const name=attr(pic,'alt');must(nodes(c[3],n=>n.tagName==='p').some(n=>text(n)===name));
  const logo=image(attr(pic,'src'),spec.origin,/^\/_next\/image$/);const asset=new URL(new URL(logo).searchParams.get('url'));
  must(asset.origin==='https://bundesliga-craftcms-production-bucket.s3.eu-central-1.amazonaws.com'&&!asset.username&&!asset.password&&asset.pathname.endsWith('/'+id[1]+'.png'),'IMAGE_IDENTITY');
  rows.push({rank:int(c[0]),team:name,team_id:'news-oefbl:'+id[1],logo:asset.href,...stats(c.slice(4,12))});
 }
 return {rows:complete(rows,spec),season:selected};
}
function turkey(doc,spec,now){
 const h=one(byClass(doc,'moduleTitle').filter(n=>/^Trendyol 1\. Lig 20\d{2}-20\d{2} Sezonu Puan Cetveli$/.test(text(n))));
 const selected=season(/(20\d{2}-20\d{2})/.exec(text(h))[1],now),table=one(byClass(doc,'s-table')),trs=nodes(table,n=>n.tagName==='tr');
 must(JSON.stringify(cells(trs[0]).map(text))===JSON.stringify(['','O','G','B','M','A','Y','AV','P']),'TABLE_COLUMNS');
 const rows=[];
 for(const tr of trs.slice(1)){
  const c=cells(tr);must(c.length===9,'TABLE_COLUMNS');const a=one(nodes(c[0],n=>n.tagName==='a'));
  const u=new URL(attr(a,'href'),spec.origin);must(u.origin===spec.origin&&!u.username&&!u.password&&u.pathname.toLowerCase()==='/default.aspx'&&u.searchParams.get('pageId')==='28');
  const id=u.searchParams.get('kulupID');must(/^\d+$/.test(id));const n=/^(\d+)\.(.+)$/.exec(text(a));must(n);
  rows.push({rank:int(n[1]),team:n[2].trim(),team_id:'news-tff:'+id,logo:null,...stats(c.slice(1))});
 }
 return {rows:complete(rows,spec),season:selected};
}
function serbia(doc,spec,now){
 const title=text(one(nodes(doc,n=>n.tagName==='title')));
 const m=/^srbijasport\.net - Fudbal - Muškarci - (20\d{2}-20\d{2}) - Mozzart Bet Prva liga Srbije - Rezultati$/.exec(title);must(m);const selected=season(m[1],now);
 const table=one(nodes(doc,n=>n.tagName==='table'&&cls(n,'ssnet-table'))),league=attr(table,'league');must(/^\d+$/.test(league)&&attr(table,'sport')==='football'&&attr(table,'layout')==='standings');
 must(nodes(doc,n=>n.tagName==='a').some(a=>attr(a,'href')===`/league/${league}-mozzart-bet-prva-liga-srbije`&&text(a)===selected.replace('/','-')));
 const data=one(byClass(table,'data')),rows=[];
 for(const tr of nodes(data,n=>n.tagName==='tr')){
  const c=cells(tr),id=attr(tr,'data-club-id');if(!id&&c.length===1&&!text(tr))continue;must(c.length===11&&/^\d+$/.test(id),'TABLE_COLUMNS');
  const name=text(one(byClass(c[2],'team-name'))),a=one(nodes(c[2],n=>n.tagName==='a'));
  must(new RegExp(`^/club/${id}-[^/]+$`).test(attr(a,'href')));
  rows.push({rank:int(one(byClass(c[0],'pos-deleg'))),team:name,team_id:'news-srbijasport:'+id,logo:null,...stats([...c.slice(3,10),one(byClass(c[10],'pts-wrapper'))])});
 }
 return {rows:complete(rows,spec),season:selected,leagueId:league};
}
const PARSERS={czech,austria,turkey,serbia};
function parseRegionalTable(html,competition,now=Date.now()){
 const spec=Object.hasOwn(SOURCES,competition)?SOURCES[competition]:null;must(spec&&typeof html==='string'&&html.length<=4000000,'UNKNOWN_SOURCE');must(!html.includes('\uFFFD'),'SOURCE_ENCODING');
 const result=PARSERS[spec.parser](parse(html),spec,now);const rows=result.rows.map(r=>({...r,season:result.season,country_id:spec.country,group:null,stage:'Regular season'}));
 return {competition:{id:competition,sport:'football',name:spec.name,country_id:spec.country},sport:'football',season:result.season,seasons:[result.season],rows,available:true,stale:false,source:spec.source,source_url:spec.origin+spec.path,updated_at:new Date(now).toISOString(),_newsRead:{supplementary:true,readAt:new Date(now).toISOString(),sourceUpdatedAt:null,scope:'publisher_reported_standings',completeSeasonCoverageVerified:false,...(result.leagueId?{sourceLeagueId:result.leagueId}:{})}};
}
module.exports={SOURCES,parseRegionalTable,nodes,attr,text,cls};
