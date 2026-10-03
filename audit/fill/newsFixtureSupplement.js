/** Publisher-reported fixtures/results for EMPTY News menus. No sporting writes. */
import {newsMatches} from './newsFootballData.js';
const cache=new Map();
export function clearNewsFixtureCache(){cache.clear();}
const must=x=>{if(!x)throw Error('Unverified source fixture data');};
const picture=value=>{try{const u=new URL(value);return u.protocol==='https:'&&/(^|\.)espncdn\.com$/.test(u.hostname)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
export function parseNewsSourceBoard(raw,competition,spec,sourceTable,year,now=Date.now()){
 must(raw&&Array.isArray(raw.leagues)&&raw.leagues.length===1&&raw.leagues[0].uid===spec.uid&&raw.leagues[0].slug===spec.slug&&raw.leagues[0].name===spec.name);
 must(Array.isArray(raw.events)&&raw.events.length<1000);
 const season=sourceTable.season,seasonYear=Number(season.split('/')[0]),rows=[],ids=new Set();
 for(const event of raw.events){
  must(/^\d+$/.test(event.id)&&event.uid===`${spec.uid}~e:${event.id}`&&Array.isArray(event.competitions)&&event.competitions.length===1);
  must(Number.isFinite(Date.parse(event.date))&&new Date(event.date).getUTCFullYear()===year);
  if(event.season?.year!==seasonYear)continue;
  const c=event.competitions[0];must(c.id===event.id&&c.uid===`${event.uid}~c:${c.id}`&&Date.parse(c.date)===Date.parse(event.date));
  must(Array.isArray(c.competitors)&&c.competitors.length===2&&!ids.has(event.id));ids.add(event.id);
  const status=c.status?.type;must(status&&['pre','in','post'].includes(status.state)&&typeof status.completed==='boolean');
  let normalized=status.completed&&status.state==='post'?'finished':status.state==='in'?'live':null;
  if(/POSTPONED/.test(status.name))normalized='postponed';
  else if(/CANCELED|CANCELLED/.test(status.name))normalized='cancelled';
  else if(status.state==='pre'&&status.name==='STATUS_SCHEDULED')normalized='scheduled';
  must(normalized);if(normalized==='finished')must(Date.parse(c.date)<=now);
  const sides={},scores={home:null,away:null};
  for(const side of c.competitors){
   const name=side.homeAway,team=side.team;must(['home','away'].includes(name)&&!sides[name]&&side.type==='team'&&team&&/^\d+$/.test(team.id)&&team.uid===`s:600~t:${team.id}`&&typeof team.displayName==='string');
   sides[name]={name:team.displayName,id:'news-espn:'+team.id,logo:picture(team.logo)||(team.logos||[]).map(l=>picture(l.href)).find(Boolean)||null};
   if(normalized==='finished'||normalized==='live'){must(/^\d{1,2}$/.test(String(side.score)));scores[name]=Number(side.score);}
  }
  must(sides.home.id!==sides.away.id);
  const id='news-espn:'+event.id,exact=c.timeValid===true,sourceDate=event.date.slice(0,10);
  rows.push({id,key:id,sport:'football',competition_key:spec.key||competition,season,status:normalized,start_time:exact?new Date(event.date).toISOString():sourceDate+'T00:00:00.000Z',start_precision:exact?'EXACT_TIME':'DATE_ONLY',...(!exact?{source_date:sourceDate,source_timezone:null}:{}),home:sides.home,away:sides.away,score:scores,details_available:false,source_status:status.description,source_status_detail:status.detail,score_observed_at:new Date(now).toISOString()});
 }
 return rows;
}
async function readBoard(url,fetcher,signal){
 const controller=new AbortController();let timer,abort;
 const stopped=new Promise((_,reject)=>{abort=()=>{controller.abort();reject(new DOMException('Cancelled','AbortError'));};signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>{controller.abort();reject(Error('News fixture source timeout'));},12000);});
 try{return await Promise.race([(async()=>{const r=await fetcher(url,{method:'GET',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:controller.signal});must(r.ok&&r.status===200&&(r.headers.get('content-type')||'').includes('json'));const text=await r.text();must(text.length<6000000);return JSON.parse(text);})(),stopped]);}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function loadNewsSourceMatches(competition,spec,options,readTable){
 const {season='',range=null,signal,now=Date.now(),fetcher=globalThis.fetch}=options;
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 const table=await readTable();if(!table)return null;
 const years=table.season.split('/').map(Number);must(years.length<=2&&years.every(y=>y>=2000&&y<=2100));
 const key=competition+':'+table.season,saved=cache.get(key);if(saved?.until>now&&saved.error)throw Error(saved.error);let data=saved?.until>now?saved.data:null;
 if(!data){
  const events=[],seen=new Set();
  try{for(const year of years){
   if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
   const url=`https://site.web.api.espn.com/apis/site/v2/sports/soccer/${spec.slug}/scoreboard?dates=${year}&limit=1000`;
   const raw=await readBoard(url,fetcher,signal),part=parseNewsSourceBoard(raw,competition,spec,table,year,now);
   for(const event of part){must(!seen.has(event.id));seen.add(event.id);events.push(event);}
  }}catch(error){if(!signal?.aborted)cache.set(key,{error:error.message,until:now+120000});while(cache.size>24)cache.delete(cache.keys().next().value);throw error;}
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  data={competition:table.competition,sport:'football',season:table.season,seasons:table.seasons,events,available:true,source:'espn-public-schedule',checked_at:new Date(now).toISOString(),coverage:{scope:'publisher_reported_season_records',stale:false,truncated:false},_newsRead:{...table._newsRead,scope:'publisher_reported_season_records',completeSeasonCoverageVerified:false}};
  cache.set(key,{data,until:now+300000});while(cache.size>24)cache.delete(cache.keys().next().value);
 }
 return {...data,events:newsMatches(data,competition,{season,range}),_newsRead:{...data._newsRead,...(range?{rangeKey:range.key}:{})}};
}
