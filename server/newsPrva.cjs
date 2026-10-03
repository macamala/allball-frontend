'use strict';
/** Two fixed official public pages for NEWS. No database, AI or Live Scores writes. */
const {parse}=require('parse5');
const ORIGIN='https://www.prvaliga.rs';
const PATHS=Object.freeze({standings:'/sezona/tebela-takmicenja/',matches:'/sezona/raspored-i-rezultati/'});
const NAME='Prva liga Srbije',KEY='serbia-prva-liga',LOGO=ORIGIN+'/wp-content/themes/newweb-theme/images/MPLS-logo-h.svg';
const assert=yes=>{if(!yes)throw Error('Unverified official Prva Liga data');};
const attr=(n,key)=>(n?.attrs||[]).find(a=>a.name===key)?.value||'';
const classes=n=>attr(n,'class').split(/\s+/);
function nodes(root,test){const out=[];function walk(n){if(test(n))out.push(n);for(const c of n.childNodes||[])walk(c);}walk(root);return out;}
const byClass=(n,key)=>nodes(n,v=>classes(v).includes(key));
function text(n){if(['script','style'].includes(n?.tagName))return '';return n?.nodeName==='#text'?n.value:(n?.childNodes||[]).map(text).join(' ').replace(/\s+/g,' ').trim();}
function one(n,key){const a=byClass(n,key);assert(a.length===1);return a[0];}
const integer=(v,signed=false)=>{const s=text(v);assert((signed?/^-?\d+$/:/^\d+$/).test(s));const n=Number(s);assert(Number.isSafeInteger(n));return n;};
function badge(n){const images=nodes(n,v=>v.tagName==='img');assert(images.length===1);const url=attr(images[0],'src').trim();const match=/^https:\/\/www\.prvaliga\.rs\/wp-content\/themes\/newweb-theme\/images\/grbovi\/(\d+)\.svg$/.exec(url);assert(match);return {id:'news-prva:'+match[1],logo:url};}
function document(html,view,now){
 assert(typeof html==='string'&&html.length<3000000);const doc=parse(html);
 const canonical=nodes(doc,n=>n.tagName==='link'&&attr(n,'rel')==='canonical');assert(canonical.length===1&&attr(canonical[0],'href')===ORIGIN+PATHS[view]);
 const nav=nodes(doc,n=>n.tagName==='a').map(text).filter(t=>/^Sezona \d{2}\/\d{2}$/.test(t));assert(new Set(nav).size===1);
 const found=/^Sezona (\d{2})\/(\d{2})$/.exec(nav[0]);assert(found);const year=2000+Number(found[1]);assert(Number(found[2])===(year+1)%100);
 assert(now>=Date.UTC(year,6,1)&&now<Date.UTC(year+1,7,1));
 const logo=nodes(doc,n=>n.tagName==='img'&&attr(n,'id')==='logo_img');assert(logo.length===1&&attr(logo[0],'src').trim()===LOGO&&attr(logo[0],'alt')===NAME);
 return {doc,year,season:`${year}/${year+1}`};
}
function base(season,view,now){return {competition:{id:KEY,sport:'football',name:NAME,country_id:'rs',logo:LOGO},sport:'football',season,seasons:[season],available:true,stale:false,source:'official-prva-liga',source_url:ORIGIN+PATHS[view],updated_at:new Date(now).toISOString(),checked_at:new Date(now).toISOString(),_newsRead:{readAt:new Date(now).toISOString(),sourceUpdatedAt:null,supplementary:true,scope:'official_published_records',completeSeasonCoverageVerified:false}};}
function parseStandings(html,now=Date.now()){
 const {doc,season}=document(html,'standings',now),tables=nodes(doc,n=>n.tagName==='table'&&classes(n).includes('preliminarno'));assert(tables.length===1);
 const head=nodes(tables[0],n=>n.tagName==='th').map(text);assert(JSON.stringify(head)===JSON.stringify(['POZ.','KLUB','ODIG.','POB.','NER.','POR.','DATO','PRIM.','RAZ.','BOD.']));
 const rows=[],ranks=new Set(),teams=new Set();
 for(const tr of nodes(tables[0],n=>n.tagName==='tr')){
  const cols=(tr.childNodes||[]).filter(n=>n.tagName==='td');if(!cols.length)continue;assert(cols.length===11);
  const b=badge(cols[1]),rank=integer(cols[0]);assert(rank>0&&rank<=16&&!ranks.has(rank)&&!teams.has(b.id));ranks.add(rank);teams.add(b.id);
  const row={rank,team:text(cols[2]),team_id:b.id,logo:b.logo,played:integer(cols[3]),wins:integer(cols[4]),draws:integer(cols[5]),losses:integer(cols[6]),goals_for:integer(cols[7]),goals_against:integer(cols[8]),goal_difference:integer(cols[9],true),points:integer(cols[10],true),season,stage:'Regular season',group:null,country_id:'rs'};
  assert(row.team&&row.played===row.wins+row.draws+row.losses&&row.goal_difference===row.goals_for-row.goals_against);rows.push(row);
 }
 assert(rows.length===16);return {...base(season,'standings',now),rows,table_status:'provisional'};
}
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function localParts(ms){return Object.fromEntries(formatter.formatToParts(new Date(ms)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
function kickoff(raw,time,year){
 const m=/^(\d{2})\.(\d{2})\.(20\d{2})$/.exec(raw);assert(m);const d=+m[1],mo=+m[2],y=+m[3],date=`${m[3]}-${m[2]}-${m[1]}`;assert(y===year||y===year+1);
 const exact=/^([01]\d|2[0-3]):([0-5]\d)$/.test(time);assert(exact||time==='--:--');
 if(!exact){const check=new Date(Date.UTC(y,mo-1,d));assert(check.getUTCFullYear()===y&&check.getUTCMonth()===mo-1&&check.getUTCDate()===d);return {start_time:date+'T00:00:00.000Z',start_precision:'DATE_ONLY',source_date:date,source_timezone:null};}
 const [h,mi]=time.split(':').map(Number),wall=Date.UTC(y,mo-1,d,h,mi),valid=[];
 for(const offset of [60,120]){const ms=wall-offset*60000,p=localParts(ms);if(p.year===y&&p.month===mo&&p.day===d&&p.hour===h&&p.minute===mi)valid.push(ms);}
 assert(valid.length===1);return {start_time:new Date(valid[0]).toISOString(),start_precision:'EXACT_TIME',source_date:date,source_timezone:'Europe/Belgrade'};
}
function parseMatches(html,now=Date.now()){
 const {doc,year,season}=document(html,'matches',now),heading=nodes(doc,n=>n.tagName==='h2'&&classes(n).includes('title')).map(text);assert(heading.includes('Raspored i rezultati '+`${year}/${String(year+1).slice(2)}`));
 const events=[],seen=new Set(),counts=new Map(),names=new Map(),roundTeams=new Map();
 for(const block of byClass(doc,'widget-single-match')){
  let ancestor=block,round=null,href=null;while(ancestor){const id=attr(ancestor,'id');if(/^kolo-\d+$/.test(id))round=Number(id.slice(5));if(ancestor.tagName==='a'&&!href)href=attr(ancestor,'href');ancestor=ancestor.parentNode;}
  assert(round>=1&&round<=30&&(!href||new RegExp(`^https://www\\.prvaliga\\.rs/utakmica/${round}-kolo-[^/]+/$`).test(href)));
  const part=one(block,'match-participants'),date=text(one(part,'match-date')),time=text(one(part,'match-time')),start=kickoff(date,time,year),badges=byClass(part,'match-team-logo');assert(badges.length===2);
  const home={name:text(one(part,'match-home')),...badge(badges[0])},away={name:text(one(part,'match-away')),...badge(badges[1])};assert(home.name&&away.name&&home.id!==away.id);
  for(const team of [home,away]){assert(!names.has(team.id)||names.get(team.id).name===team.name);names.set(team.id,team);}
  const rawStatus=text(one(part,'match-bagde')),rawScore=text(one(part,'match-result')),status=({'Odigrano':'finished','Planirano':'scheduled','Zakazano':'scheduled','Odloženo':'postponed','Otkazano':'cancelled'})[rawStatus];assert(status);
  let score={home:null,away:null};if(status==='finished'){assert(/^\d+:\d+$/.test(rawScore));const [h,a]=rawScore.split(':').map(Number);assert(h<=50&&a<=50&&Date.parse(start.start_time)<=now);score={home:h,away:a};}else assert(rawScore===':'||rawScore==='-:-'||rawScore==='');
  const id=`news-prva:${season}:${round}:${home.id.split(':')[1]}:${away.id.split(':')[1]}`;assert(!seen.has(id));seen.add(id);counts.set(round,(counts.get(round)||0)+1);
  const used=roundTeams.get(round)||new Set();assert(!used.has(home.id)&&!used.has(away.id));used.add(home.id);used.add(away.id);roundTeams.set(round,used);
  events.push({id,key:id,sport:'football',competition_key:KEY,competition_name:NAME,competition_logo:LOGO,football_gender:'men',season,round,...start,status,home,away,score,venue:text(one(part,'match-venue')),source_url:href||ORIGIN+PATHS.matches,details_available:false});
 }
 assert(names.size===16&&events.length===240&&counts.size===30&&[...counts.values()].every(n=>n===8));
 return {...base(season,'matches',now),events,teams:[...names.values()],coverage:{scope:'official_regular_season_schedule',truncated:false,stale:false},_newsRead:{...base(season,'matches',now)._newsRead,regularSeasonScheduleComplete:true}};
}
module.exports={PATHS,ORIGIN,parseStandings,parseMatches,kickoff};
