'use strict';
/** NEWS-only, bounded read adapter. Existing public profiles/matches remain unchanged.
 * No model, writer, database credentials, sporting mutations or arbitrary URL proxy.
 */
const {addSquadPlayerLinks}=require('./newsPlayerFacts.cjs');
const API='https://allball-backend-production.up.railway.app';
const {createNativeIdentityReader,qualifyNewsEvents,categoryOf,identityName}=require('./newsEntityIdentity.cjs');
const {teamMentioned,SHORT}=require('./newsEntityMention.cjs');
const nativeSpecs=require('./newsEntitySources.json').specs;
const DAY=86400000;
const SLUG=/^[a-z0-9][a-z0-9-]{0,220}$/;
const ID=/^[a-zA-Z0-9_.:-]{1,120}$/;
const GENERIC=new Set(['city','united','racing','union','start','como','nice','inter','sporting','nacional','arsenal women','reading']);
const NAMES={
 'manchester united':['Man Utd','Manchester Utd'], 'manchester city':['Man City'],
 'paris saint germain':['PSG'], 'bayern munchen':['Bayern Munich'],
 'brighton hove albion':['Brighton & Hove Albion'], 'wolverhampton wanderers':['Wolves'],
 'tottenham hotspur':['Tottenham'], 'internazionale':['Inter Milan'], 'inter':['Inter Milan'],
 'bayer 04 leverkusen':['Bayer Leverkusen','Leverkusen'], 'bayer leverkusen':['Bayer 04 Leverkusen','Leverkusen'],
 'ilves':['Tampereen Ilves'], 'tampereen ilves':['Ilves'],
 'ogc nice':['Nice'], 'nice':['OGC Nice'], 'inter milan':['AC Internazionale'],
 'crvena zvezda':['Crvena Zvezda','Red Star Belgrade'], 'partizan beograd':['Partizan','Partizan Belgrade'],
};
function normalize(text){return String(text||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/[øđßæł]/g,c=>({'ø':'o','đ':'dj','ß':'ss','æ':'ae','ł':'l'}[c])).replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function inText(text,alias){const n=normalize(alias);return n.length>=4&&new RegExp('(?:^| )'+escape(n)+'(?: |$)','u').test(text);}
function mentioned(text,alias){return inText(normalize(text),alias);}
function teamAliases(side){
 const name=String(side?.name||side?.display_name||'').trim();
 if(!name)return [];
 const trimmed=name.replace(/^(?:FC|AFC|FK|CF)\s+/i,'').replace(/\s+(?:FC|AFC|FK|CF)$/i,'').trim();
 return [...new Set([name,trimmed,side.display_name,side.source_name,...(NAMES[normalize(trimmed)]||[])].filter(v=>typeof v==='string'&&v.trim()&&(normalize(v).length>=4||SHORT.has(v))&&(!GENERIC.has(normalize(v))||normalize(v)==='nice')))];
}
function dateOf(value){const input=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)?value+'Z':value;const n=Date.parse(input);return Number.isFinite(n)?n:null;}
function genderFor(article){
 const key=String(article?.league||'');const lead=normalize(String(article?.title||'')+' '+String(article?.summary||''));
 if(/women|womens|female|ladies|frauen|femminile|zfk|женск/.test(lead)||/women|nwsl/.test(key))return 'women';
 if(/\b(?:u\s?\d{1,2}|under \d{1,2})\b/.test(lead)||/youth|under-\d/.test(key)||/\b(?:youth team|academy team|youth squad)\b/.test(normalize(article?.title)))return 'youth';
 // News taxonomy keeps the women's/youth lanes distinct. Require explicit
 // event category; never let unknown-category fixtures supply identity.
 return 'men';
}
function compatibleEvent(event,gender){
 if(!event||event.sport!=='football'||!ID.test(String(event.id||''))||!event.competition_key||!dateOf(event.start_time))return false;
 if(categoryOf(event)!==gender)return false;
 if(gender==='men'&&/\b(?:women|womens|female|ladies|u ?\d{1,2}|under \d{1,2})\b/.test(normalize(event.home?.name)+' '+normalize(event.away?.name)))return false;
 return [event.home,event.away].every(side=>side&&ID.test(String(side.id||''))&&typeof side.name==='string'&&side.name.trim());
}
function findTeams(article,events){
 const raw=[article.title,article.summary,article.content].filter(Boolean).join('\n').slice(0,80000);
 const primary=String(article.title||'')+' '+String(article.summary||'');
 const gender=genderFor(article),stamp=dateOf(article.published_at)||dateOf(article.created_at)||Date.now();
 const byIdentity=new Map(),aliasCache=new Map();
 for(const event of events){
  if(!compatibleEvent(event,gender))continue;
  for(const side of [event.home,event.away]){
   const cacheKey=String(side.id)+':'+side.name;
   if(!aliasCache.has(cacheKey))aliasCache.set(cacheKey,teamAliases(side).filter(alias=>teamMentioned(raw,alias)));
   const aliases=aliasCache.get(cacheKey);if(!aliases.length)continue;
   const id=String(side.id),key=gender+':'+id;
   const distance=Math.abs(dateOf(event.start_time)-stamp);
   const score=(event.competition_key===article.league?-100*DAY:0)+distance;
   const prior=byIdentity.get(key);
   if(prior){prior.aliases=[...new Set([...prior.aliases,...aliases])];if(score>=prior.score)continue;}
   const name=String(side.name);const params=new URLSearchParams({sport:'football',competition:event.competition_key,name});
   byIdentity.set(key,{kind:'team',id,name,aliases:[...new Set([...(prior?.aliases||[]),...aliases])],
    href:'/teams/'+encodeURIComponent(id)+'?'+params,logo:safeImage(side.logo),competition:event.competition_key,
    gender,event_id:event.id,primary:aliases.some(a=>teamMentioned(primary,a)),score});
  }
 }
 // Different canonical IDs bearing the same label are not interchangeable.
 const owners=new Map();for(const team of byIdentity.values())for(const alias of team.aliases){const a=normalize(alias);const set=owners.get(a)||new Set();set.add(team.id);owners.set(a,set);}
 return [...byIdentity.values()].map(t=>({...t,aliases:t.aliases.filter(a=>owners.get(normalize(a)).size===1)}))
  .filter(t=>t.aliases.length).sort((a,b)=>Number(b.primary)-Number(a.primary)||a.score-b.score).slice(0,12);
}
function safeImage(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function lineupPlayers(detail,event){
 if(!detail||detail.id!==event.id||detail.event?.id!==event.id||detail.event?.sport!=='football'||detail.event?.competition_key!==event.competition_key)return [];
 for(const side of ['home','away'])if(String(detail.event[side]?.id)!==String(event[side]?.id))return [];
 const output=[];
 for(const side of ['home','away']){
  const lineup=detail.lineups?.[side];if(!lineup||typeof lineup!=='object')continue;
  for(const field of ['start','bench','starters','substitutes']){
   if(!Array.isArray(lineup[field]))continue;
   for(const entry of lineup[field].slice(0,40)){
    const player=entry?.player&&typeof entry.player==='object'?{...entry,...entry.player}:entry;
    const id=String(player?.id||player?.player_id||'');const name=player?.name||player?.display_name;
    if(!ID.test(id)||typeof name!=='string'||!name.trim())continue;
    output.push({id,name:name.trim(),image:safeImage(player.image||player.photo),event_id:event.id,
     competition:event.competition_key,team_id:String(event[side].id),team_name:event[side].name});
   }
  }
 }
 return output;
}
function findPlayers(article,candidates){
 const text=normalize([article.title,article.summary,article.content].filter(Boolean).join('\n').slice(0,80000));
 const identified=new Map();
 for(const player of candidates){
  const parts=player.name.split(/\s+/).filter(Boolean);
  const aliases=[player.name];if(parts.length>2)aliases.push(parts[0]+' '+parts.at(-1));
  // A first/last-name alias still comes from the same verified lineup record.
  const matched=aliases.filter(a=>normalize(a).split(' ').length>=2&&inText(text,a));
  if(!matched.length||identified.has(player.id))continue;
  const q=new URLSearchParams({name:player.name,event_id:player.event_id,competition_key:player.competition});
  identified.set(player.id,{kind:'player',...player,aliases:[...new Set(matched)],href:'/players/'+encodeURIComponent(player.id)+'?'+q});
 }
 const values=[...identified.values()];const owners=new Map();
 for(const p of [...values,...candidates])for(const a of [...(p.aliases||[]),p.name.split(/\s+/).at(-1)]){const key=normalize(a);const s=owners.get(key)||new Set();s.add(p.id);owners.set(key,s);}
 for(const p of values){
  const surname=p.name.split(/\s+/).at(-1);
  if(normalize(surname).length>=5&&owners.get(normalize(surname))?.size===1&&inText(text,surname))p.aliases.push(surname);
  p.aliases=[...new Set(p.aliases)].filter(a=>owners.get(normalize(a))?.size===1);
 }
 return values.filter(p=>p.aliases.length).slice(0,16);
}
function relatedEvents(article,events,teams){
 const ids=new Set(teams.map(t=>t.id)),gender=genderFor(article),stamp=dateOf(article.published_at)||Date.now();
 return events.filter(e=>compatibleEvent(e,gender)&&[e.home,e.away].some(s=>ids.has(String(s.id))))
  .sort((a,b)=>{
   const count=e=>[e.home,e.away].filter(s=>ids.has(String(s.id))).length;
   return count(b)-count(a)||Math.abs(dateOf(a.start_time)-stamp)-Math.abs(dateOf(b.start_time)-stamp);
  });
}
function validReadPath(path){
 if(typeof path!=='string'||path.length>1500||/[#\\\r\n]/.test(path))return false;
 if(/^\/articles\/[a-z0-9][a-z0-9-]{0,220}$/.test(path))return true;
 if(/^\/sports-data\/matches\/[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$/.test(path))return true;
 if(/^\/sports-data\/competitions\/[a-z][a-z0-9-]{2,100}\/hub$/.test(path))return true;
 const team=/^\/sports-data\/teams\/([a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119})\?(.+)$/.exec(path);
 if(team){
  const q=new URLSearchParams(team[2]);
  if(q.get('sport')!=='football'||!q.get('name')||!Object.hasOwn(nativeSpecs,q.get('competition')||''))return false;
  return [...q.keys()].every(k=>['sport','name','competition'].includes(k)&&q.getAll(k).length===1);
 }
 if(!path.startsWith('/sports-data/events?'))return false;
 const query=new URLSearchParams(path.split('?')[1]);
 if(query.get('sport')!=='football')return false;
 for(const name of query.keys())if(!['sport','date_from','date_to'].includes(name)||query.getAll(name).length!==1)return false;
 for(const name of ['date_from','date_to'])if(query.has(name)&&(!/^\d{4}-\d{2}-\d{2}$/.test(query.get(name))||dateOf(query.get(name))===null))return false;
 return !query.has('date_from')||!query.has('date_to')||dateOf(query.get('date_to'))>=dateOf(query.get('date_from'));
}
function createPublicReader({fetcher=fetch,clock=Date.now,timeoutMs=12000,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const cache=new Map(),inflight=new Map();let active=0;const waiting=[];let bytes=0;
 // One bounded retry only for an idempotent read and a temporary failure.
 // Invalid payloads, permission failures and rate limits must not be retried.
 const retryable=error=>['TimeoutError','AbortError'].includes(error?.name)||
  [408,502,503,504].includes(error?.status)||
  (error instanceof TypeError&&/fetch|network|terminated/i.test(error.message));
 async function slot(fn){
  if(active>=4){if(waiting.length>=64)throw Error('News context busy');await new Promise(resolve=>waiting.push(resolve));}
  else active++;
  try{return await fn();}finally{if(waiting.length)waiting.shift()();else active--;}
 }
 async function once(path){
  const controller=new AbortController();let timer,reader;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{
   controller.abort();reject(new DOMException('News data read timed out','TimeoutError'));
  },Math.max(1,Math.min(timeoutMs,20000)));});
  const operation=(async()=>{
   const response=await fetcher(API+path,{method:'GET',credentials:'omit',redirect:'error',
    headers:{Accept:'application/json','User-Agent':'NinkoSports-NewsContext/1.0'},signal:controller.signal});
   if(!response.ok)throw Object.assign(Error('News data unavailable'),{status:response.status});
   if(!/(?:application\/json)/i.test(response.headers.get('content-type')||''))throw Error('News data type');
   if(Number(response.headers.get('content-length')||0)>8*1024*1024)throw Error('News data size');
   const chunks=[];let total=0;reader=response.body.getReader();
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;
    if(total>8*1024*1024)throw Error('News data size');chunks.push(Buffer.from(value));}
   return {data:JSON.parse(Buffer.concat(chunks).toString('utf8')),size:total};
  })();
  try{return await Promise.race([operation,timeout]);}
  finally{clearTimeout(timer);if(reader)reader.cancel().catch(()=>{});}
 }
 return async function read(path,ttl=300000){
  if(!validReadPath(path))throw Error('Invalid News read');
  const saved=cache.get(path);if(saved&&clock()-saved.at<ttl)return saved.data;
  if(inflight.has(path))return inflight.get(path);
  const task=slot(async()=>{
   let result;
   for(let attempt=0;attempt<2;attempt++){
    try{result=await once(path);break;}
    catch(error){if(attempt||!retryable(error))throw error;await sleep(250);}
   }
   const previous=cache.get(path);if(previous)bytes-=previous.size;
   cache.delete(path);cache.set(path,{...result,at:clock()});bytes+=result.size;
   while(cache.size>128||bytes>32*1024*1024){const k=cache.keys().next().value;bytes-=cache.get(k).size;cache.delete(k);}
   return result.data;
  }).finally(()=>inflight.delete(path));
  inflight.set(path,task);return task;
 };
}
function identityKeys(article,events){
 const raw=[article.title,article.summary,article.content].filter(Boolean).join('\n').slice(0,80000);
 const ranked=new Map();
 if(Object.hasOwn(nativeSpecs,article.league||''))ranked.set(article.league,1000);
 for(const event of events){
  const key=event?.competition_key;if(event?.sport!=='football'||!Object.hasOwn(nativeSpecs,key||''))continue;
  if([event.home,event.away].some(side=>teamAliases(side).some(alias=>teamMentioned(raw,alias))))ranked.set(key,(ranked.get(key)||0)+1);
 }
 return [...ranked].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key])=>key);
}
function contextLoader({read=createPublicReader(),nativeRead=createNativeIdentityReader(),playerRead=null,clock=Date.now}={}){
 const cached=new Map(),inflight=new Map();
 return async function load(slug){
  if(!SLUG.test(slug))throw Error('Invalid article slug');
  const old=cached.get(slug);if(old&&clock()-old.at<300000)return old.data;
  if(inflight.has(slug))return inflight.get(slug);
  if(inflight.size>=16)throw Error('News context busy');
  const task=(async()=>{
   const article=await read('/articles/'+slug);
   if(article?.slug!==slug||article.sport!=='football'||article.quality_ok===false||article.sport_match_ok===false||!article.id)throw Error('Unverified article scope');
   const published=dateOf(article.published_at)||dateOf(article.created_at);
   if(!published||published>clock()+DAY||published<Date.UTC(2000,0,1))throw Error('Unverified article date');
   const start=new Date(published-21*DAY).toISOString().slice(0,10),end=new Date(published+7*DAY).toISOString().slice(0,10);
   const payload=await read('/sports-data/events?'+new URLSearchParams({sport:'football',date_from:start,date_to:end}));
   if(payload?.sport!=='football'||!Array.isArray(payload.events)||payload.events.length>10000)throw Error('Unverified football records');
   let events=payload.events;let partial=payload.snapshot?.complete===false;
   // Exact competition hub supplies identity when no fixture is in the window.
   if(/^[a-z][a-z0-9-]{2,100}$/.test(article.league||'')&&!article.league.startsWith('football-')){
    try{const hub=await read('/sports-data/competitions/'+article.league+'/hub');
     if(hub.competition?.id===article.league&&Array.isArray(hub.events))events=[...events,...hub.events.filter(e=>e.competition_key===article.league)];
    }catch{partial=true;}
   }
   const unique=new Map();for(const e of events)if(e?.id&&!unique.has(e.id))unique.set(e.id,e);events=[...unique.values()];
   const books=new Map();
   await Promise.all(identityKeys(article,events).map(async key=>{
    try{const book=await nativeRead(key);if(book)books.set(key,book);else partial=true;}catch{partial=true;}
   }));
   events=qualifyNewsEvents(events,books);
   let teams=findTeams(article,events);
   const nativeCandidates=[];const lead=String(article.title||'')+' '+String(article.summary||'');
   for(const book of books.values()){
    if(book.gender!==genderFor(article))continue;
    for(const side of book.teams.values()){
     const aliases=teamAliases(side).filter(alias=>teamMentioned(lead,alias));
     if(aliases.length&&!teams.some(t=>t.id===side.id)&&nativeCandidates.length<4)
      nativeCandidates.push({side,aliases,book});
    }
   }
   const repaired=await Promise.all(nativeCandidates.map(async({side,aliases,book})=>{
    const query=new URLSearchParams({sport:'football',competition:book.key,name:side.name});
    try{
     const profile=await read('/sports-data/teams/'+encodeURIComponent(side.id)+'?'+query);
     if(!profile?.available||profile.sport!=='football'||String(profile.entity_key)!==side.id||
       String(profile.team?.id)!==side.id||identityName(profile.team?.name||profile.name)!==identityName(side.name)||
       (['men','women'].includes(profile.football_gender)&&profile.football_gender!==book.gender))return null;
     const records=[...(Array.isArray(profile.results)?profile.results:[]),...(Array.isArray(profile.fixtures)?profile.fixtures:[])];
     const valid=qualifyNewsEvents(records,books).filter(e=>compatibleEvent(e,book.gender)&&e.competition_key===book.key&&
       [e.home,e.away].some(s=>String(s.id)===side.id));
     if(!records.length)return null;
     return {team:{kind:'team',id:side.id,name:profile.team.name||profile.name||side.name,aliases,
      href:'/teams/'+encodeURIComponent(side.id)+'?'+query,logo:safeImage(profile.team.logo),competition:book.key,
      gender:book.gender,event_id:valid[0]?.id||null,primary:true,score:0},events:valid};
    }catch{partial=true;return null;}
   }));
   for(const row of repaired.filter(Boolean)){teams.push(row.team);for(const e of row.events)if(!events.some(x=>x.id===e.id))events.push(e);}
   const related=relatedEvents(article,events,teams);
   const past=related.filter(e=>dateOf(e.start_time)<=published&&dateOf(e.start_time)>=published-21*DAY);
   const selected=[];const used=new Set();
   // Give each named team a match first rather than probing only one club.
   for(const team of teams){const event=past.find(e=>!used.has(e.id)&&[e.home,e.away].some(s=>String(s.id)===team.id));if(event){selected.push(event);used.add(event.id);}if(selected.length>=4)break;}
   for(const e of past)if(selected.length<6&&!used.has(e.id)){selected.push(e);used.add(e.id);}
   const sets=await Promise.all(selected.map(async event=>{try{return lineupPlayers(await read('/sports-data/matches/'+event.id),event);}catch{partial=true;return [];}}));
   const players=sets.flat();
   let resolved=findPlayers(article,players);
   if(playerRead){
    const extra=await addSquadPlayerLinks(article,teams,books,resolved,{read:playerRead,clock});
    resolved=extra.players;partial=partial||extra.partial;
   }
   const matches=related.filter(e=>e.details_available!==false).slice(0,6).map(e=>({id:e.id,name:`${e.home.name} vs ${e.away.name}`,start_time:e.start_time,
    competition:e.competition_name||e.competition,href:'/scores/event/'+encodeURIComponent(e.id),relation:'Related match involving a named team'}));
   const data={article_id:article.id,slug,sport:'football',checked_at:new Date(clock()).toISOString(),partial,
    teams:teams.map(({score,primary,...t})=>t),players:resolved,matches,read_only:true,
    note:'Links use verified football records. Historical match lineups are not a current squad list.'};
   cached.set(slug,{at:clock(),data});while(cached.size>256)cached.delete(cached.keys().next().value);
   return data;
  })().finally(()=>inflight.delete(slug));inflight.set(slug,task);return task;
 };
}
module.exports={contextLoader,createPublicReader,validReadPath,normalize,mentioned,teamAliases,genderFor,compatibleEvent,findTeams,lineupPlayers,findPlayers,relatedEvents,identityKeys,SLUG};
