'use strict';
/** News-only identity evidence. Never imports fixtures, writes scores, or treats
 * old lineups as today's squad. Exact provider metadata may qualify an otherwise
 * unclassified public record; conflicting/missing evidence stays unclassified.
 */
const {specs}=require('./newsEntitySources.json');
const VERIFIED_CATEGORY=Symbol('News verified competition category');
const clean=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/[øđßæł]/g,c=>({'ø':'o','đ':'dj','ß':'ss','æ':'ae','ł':'l'}[c])).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const base=value=>clean(value).replace(/^(?:fc|afc|fk|cf)\s+/,'').replace(/\s+(?:fc|afc|fk|cf)$/,'').trim();
const equivalences={
 'bayer 04 leverkusen':'bayer leverkusen', 'ogc nice':'nice',
 'flamengo rj':'flamengo',
 'bayern munchen':'bayern munich','fc bayern munchen':'bayern munich',
 'paris saint germain':'paris saint germain','psg':'paris saint germain',
 'tottenham hotspur':'tottenham', 'atletico mg':'atletico mineiro',
 'sp subotica':'spartak subotica',
 'red star belgrade':'crvena zvezda','partizan beograd':'partizan','partizan belgrade':'partizan','tampereen ilves':'ilves',
};
function identityName(value){const name=base(value);return equivalences[name]||name;}
const numeric=value=>/^\d{1,12}$/.test(String(value||''));
function parseNativeIdentity(raw,key,now=Date.now()){
 const spec=Object.hasOwn(specs,key)?specs[key]:null,details=raw?.details;
 if(!spec||!details||String(details.id)!==spec.id||clean(details.name)!==clean(spec.name)||
   String(details.country||'').toUpperCase()!==spec.country||!['male','female'].includes(details.gender)||
   typeof details.selectedSeason!=='string'||!/^20\d{2}(?:[/-](?:20\d{2}|\d{2}))?$/.test(details.selectedSeason))return null;
 const matches=raw.fixtures?.allMatches;
 if(!Array.isArray(matches)||matches.length<1||matches.length>4000)return null;
 const teams=new Map(),conflicts=new Set();
 for(const match of matches){
  if(!numeric(match?.id))continue;
  for(const field of ['home','away']){
   const side=match[field];if(!numeric(side?.id)||typeof side.name!=='string'||!side.name.trim())continue;
   const id=String(side.id),name=identityName(side.name);
   if(teams.has(id)&&identityName(teams.get(id).name)!==name){conflicts.add(id);continue;}
   teams.set(id,{id,name:side.name});
  }
 }
 for(const id of conflicts)teams.delete(id);
 if(teams.size<2||teams.size>160)return null;
 const byName=new Map();for(const team of teams.values()){
  const n=identityName(team.name),ids=byName.get(n)||new Set();ids.add(team.id);byName.set(n,ids);
 }
 return {key,sourceId:spec.id,gender:details.gender==='male'?'men':'women',sourceName:details.name,
  sourceCountry:details.country,season:details.selectedSeason,checkedAt:now,teams,byName};
}
function categoryOf(event){return event?.[VERIFIED_CATEGORY]||event?.football_gender;}
function sideVerified(side,book){
 const row=book.teams.get(String(side?.id||''));
 return Boolean(row&&identityName(row.name)===identityName(side?.name));
}
function sideContradiction(side,book){
 const id=String(side?.id||''),n=identityName(side?.name);
 if(!id||!n)return false;
 // These are the same source namespace only when that exact native id/name
 // is known. Never reconcile different numeric ids by a guessed club name.
 const row=book.teams.get(id),owners=book.byName.get(n);
 return Boolean((row&&identityName(row.name)!==n)||(owners&&!owners.has(id)));
}
function qualifyNewsEvents(events,books){
 const output=[];
 for(const event of events){
  const book=books?.get(event?.competition_key);
  if(!book){output.push(event);continue;}
  if(event?.sport!=='football'||['home','away'].some(s=>sideContradiction(event[s],book)))continue;
  if(event.football_gender&&!['unknown','unclassified',book.gender].includes(event.football_gender))continue;
  if(['home','away'].every(s=>sideVerified(event[s],book))){
   // Symbol cannot be supplied by a public JSON response. This annotates a
   // temporary News view, never changes stored match category or identity.
   output.push({...event,[VERIFIED_CATEGORY]:book.gender});
  }else output.push(event);
 }
 return output;
}
function createNativeIdentityReader({fetcher=fetch,clock=Date.now,timeoutMs=10000}={}){
 const cache=new Map(),inflight=new Map();let active=0;const waiting=[];
 async function fetchIdentity(key){
  if(active>=2){if(waiting.length>=12)throw Error('News identity busy');await new Promise(resolve=>waiting.push(resolve));}
  else active++;
  let reader,timer;const controller=new AbortController();
  try{
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('News identity timeout'));},Math.max(1,Math.min(timeoutMs,15000)));});
   const operation=(async()=>{
    const response=await fetcher('https://www.fotmob.com/api/data/leagues?id='+specs[key].id,
     {method:'GET',credentials:'omit',redirect:'error',headers:{Accept:'application/json','User-Agent':'NinkoSports-News-Identity/1.0'},signal:controller.signal});
    if(!response.ok||response.status!==200||!/^application\/json\b/i.test(response.headers.get('content-type')||'')||Number(response.headers.get('content-length')||0)>8*1024*1024)throw Error('News identity unavailable');
    const parts=[];let size=0;reader=response.body.getReader();
    while(true){const row=await reader.read();if(row.done)break;size+=row.value.byteLength;if(size>8*1024*1024)throw Error('News identity size');parts.push(Buffer.from(row.value));}
    const data=parseNativeIdentity(JSON.parse(Buffer.concat(parts).toString('utf8')),key,clock());
    if(!data)throw Error('Unverified competition identity');return data;
   })();
   return await Promise.race([operation,deadline]);
  }finally{clearTimeout(timer);reader?.cancel().catch(()=>{});if(waiting.length)waiting.shift()();else active--;}
 }
 return async function readIdentity(key){
  if(!Object.hasOwn(specs,key))return null;
  const saved=cache.get(key),now=clock();if(saved&&now<saved.until)return saved.data;
  if(inflight.has(key))return inflight.get(key);
  const task=fetchIdentity(key).then(data=>{cache.set(key,{data,until:clock()+6*3600000});return data;})
   .catch(()=>{cache.set(key,{data:null,until:clock()+300000});return null;})
   .finally(()=>{inflight.delete(key);while(cache.size>96)cache.delete(cache.keys().next().value);});
  inflight.set(key,task);return task;
 };
}
module.exports={parseNativeIdentity,qualifyNewsEvents,createNativeIdentityReader,categoryOf,identityName,sideVerified,sideContradiction};
