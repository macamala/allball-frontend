'use strict';
/** Federation-reported Prva NL season, isolated from the shared result database. */
const {parse}=require('parse5');
const ORIGIN='https://semafor.hns.family';
const fail=code=>Object.assign(Error('Unverified HNS News source'),{code});
const must=(v,code='HNS_IDENTITY')=>{if(!v)throw fail(code);};
const attr=(n,k)=>(n?.attrs||[]).find(a=>a.name===k)?.value||'';
const has=(n,c)=>attr(n,'class').split(/\s+/).includes(c);
function find(n,p){const out=[];function walk(x){if(p(x))out.push(x);for(const c of x.childNodes||[])walk(c);}walk(n);return out;}
function one(xs){must(xs.length===1,'HNS_STRUCTURE');return xs[0];}
function text(n){return (n?.nodeName==='#text'?n.value:(n?.childNodes||[]).map(text).join(' ')).replace(/\s+/g,' ').trim();}
const field=(n,c)=>text(one(find(n,x=>has(x,c))));
const integer=s=>{must(/^[+-]?\d+$/.test(String(s)),'HNS_NUMBER');const n=Number(s);must(Number.isSafeInteger(n),'HNS_NUMBER');return n;};
function selectHnsURL(html){const doc=parse(html),links=find(doc,n=>n.tagName==='a'&&text(n)==='SuperSport Prva NL').map(a=>new URL(attr(a,'href'),ORIGIN));const urls=[...new Set(links.filter(u=>u.origin===ORIGIN&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/natjecanja\/\d+\/supersport-prva-nl\/$/.test(u.pathname)).map(u=>u.href))];must(urls.length===1,'HNS_DISCOVERY');return urls[0];}
function logo(node,name){const img=one(find(node,n=>n.tagName==='img'));must(attr(img,'alt')===name);const u=new URL(attr(img,'src'),ORIGIN);must(u.origin==='https://hns.family'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/files\/images_comet\/[A-Za-z0-9_/.\-]+\.png$/.test(u.pathname),'HNS_IMAGE');return u.href;}
function dateValue(raw){const m=/^(\d{2})\.(\d{2})\.(20\d{2})\.(?: (\d{2}):(\d{2}))?$/.exec(raw);must(m,'HNS_DATE');const [d,mo,y,h,mi]=m.slice(1).map(Number);must(mo>=1&&mo<=12&&d>=1&&d<=31,'HNS_DATE');const plain=new Date(Date.UTC(y,mo-1,d));must(plain.getUTCDate()===d&&plain.getUTCMonth()===mo-1,'HNS_DATE');const source_date=plain.toISOString().slice(0,10);if(!m[4])return {start_time:plain.toISOString(),start_precision:'DATE_ONLY',source_date};must(h<24&&mi<60,'HNS_DATE');const target=Date.UTC(y,mo-1,d,h,mi);let at=target;const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});for(let n=0;n<3;n++){const p=Object.fromEntries(fmt.formatToParts(at).map(v=>[v.type,v.value]));const actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);at+=target-actual;}
 const p=Object.fromEntries(fmt.formatToParts(at).map(v=>[v.type,v.value]));must(+p.year===y&&+p.month===mo&&+p.day===d&&+p.hour===h&&+p.minute===mi,'HNS_DATE');return {start_time:new Date(at).toISOString(),start_precision:'EXACT_TIME',source_date};}
function parseHns(html,now=Date.now()){
 must(typeof html==='string'&&html.length<4000000&&!html.includes('\uFFFD'),'HNS_ENCODING');const doc=parse(html),heading=one(find(doc,n=>has(n,'competition-title')));must(text(one(find(heading,n=>n.tagName==='h1')))==='SuperSport Prva NL');const season=text(one(find(heading,n=>n.tagName==='h2'))),m=/^(20\d{2})\/(20\d{2})$/.exec(season);must(m&&+m[2]===+m[1]+1&&now>=Date.UTC(+m[1],6,1)&&now<Date.UTC(+m[2],7,1),'HNS_SEASON');
 const table=one(find(doc,n=>has(n,'competition_table')&&has(n,'type1'))),header=one(find(table,n=>n.tagName==='li'&&has(n,'header')));
 must(['position','club','played','wins','draws','losses','gplus','gminus','gdiff','points','form'].map(c=>field(header,c)).join('|')==='Poz|Klub|Uk|Pob|Ner|Por|G+|G-|GR|Bod|Forma','HNS_COLUMNS');
 const rows=find(table,n=>n.tagName==='li'&&has(n,'row')).map(n=>{
  const id=attr(n,'data-clubid'),club=one(find(n,x=>has(x,'club'))),a=one(find(club,x=>x.tagName==='a')),name=text(a);must(/^\d+$/.test(id)&&new RegExp(`^/klubovi/${id}/[^/]+/$`).test(attr(a,'href'))&&name);
  const values=Object.fromEntries(['position','played','wins','draws','losses','gplus','gminus','gdiff','points'].map(c=>[c,integer(field(n,c))]));must(values.played===values.wins+values.draws+values.losses&&values.gdiff===values.gplus-values.gminus,'HNS_STATISTICS');
  return {rank:values.position,team:name,team_id:'news-hns:'+id,logo:logo(club,name),played:values.played,wins:values.wins,draws:values.draws,losses:values.losses,goals_for:values.gplus,goals_against:values.gminus,goal_difference:values.gdiff,points:values.points,country_id:'hr',season,group:null,stage:'Regular season'};
 });
 must(rows.length===16&&new Set(rows.map(r=>r.team_id)).size===16&&new Set(rows.map(r=>r.rank)).size===16&&rows.every(r=>r.rank>=1&&r.rank<=16),'HNS_TABLE_INCOMPLETE');
 const teams=new Map(rows.map(r=>[r.team_id,{id:r.team_id,name:r.team,logo:r.logo}]));const root=one(find(one(find(doc,n=>has(n,'competition_results_scorers_cards'))),n=>has(n,'current_results')));
 const events=find(root,n=>n.tagName==='li'&&has(n,'row')&&attr(n,'data-match')).map(n=>{
  const id=attr(n,'data-match'),round=integer(attr(n,'data-round'));must(/^\d+$/.test(id)&&round>=1&&round<=30);
  const side=c=>{const node=one(find(n,x=>has(x,c))),key='news-hns:'+attr(node,'data-id'),team=teams.get(key);must(team&&text(one(find(node,x=>x.tagName==='a')))===team.name&&logo(node,team.name)===team.logo,'HNS_TEAM_IDENTITY');return team;};
  const home=side('club1'),away=side('club2');must(home.id!==away.id,'HNS_TEAM_IDENTITY');const date=dateValue(field(n,'date'));
  must(+date.source_date.slice(0,4)>=+m[1]&&+date.source_date.slice(0,4)<=+m[2],'HNS_MATCH_SEASON');
  const result=one(find(n,x=>has(x,'result'))),a=field(result,'res1'),b=field(result,'res2');let score={home:null,away:null},status='scheduled';
  if(a!=='-'||b!=='-'){
   score={home:integer(a),away:integer(b)};must(score.home>=0&&score.away>=0,'HNS_NUMBER');
   const link=one(find(result,x=>x.tagName==='a'));const u=new URL(attr(link,'href'),ORIGIN);
   must(u.origin===ORIGIN&&!u.username&&!u.password&&new RegExp(`^/utakmice/${id}/[^/]+-${score.home}-${score.away}/$`).test(u.pathname),'HNS_RESULT_LINK');
   // The page reports a result, not a minute-by-minute match status. Do not
   // manufacture a final/live flag, even when the stored score is numeric.
   status=Date.parse(date.start_time)<now-6*3600000?'reported_result':'awaiting_confirmation';
  }
  return {id:'news-hns:'+id,key:'news-hns:'+id,sport:'football',competition_key:'croatia-prva-nl',season,round:String(round),football_gender:'men',home,away,...date,score,status,details_available:false,source:'official-hns',updated_at:new Date(now).toISOString()};
 });
 must(events.length===240&&new Set(events.map(e=>e.id)).size===240&&new Set(events.map(e=>e.home.id+'|'+e.away.id)).size===240,'HNS_SCHEDULE_INCOMPLETE');
 for(let r=1;r<=30;r++){const matches=events.filter(e=>e.round===String(r));must(matches.length===8&&new Set(matches.flatMap(e=>[e.home.id,e.away.id])).size===16,'HNS_ROUND_INCOMPLETE');}
 return {season,rows,events,teams:[...teams.values()]};
}
module.exports={ORIGIN,parseHns,selectHnsURL,dateValue};
