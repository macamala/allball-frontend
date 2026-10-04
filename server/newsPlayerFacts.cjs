'use strict';
/** Article-scoped, verified player facts. Read-only; no sports records, writers,
 * API keys, generated biographies or guessed match identifiers. */
const {identityName}=require('./newsEntityIdentity.cjs');
const PID=/^[1-9]\d{0,11}$/;
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const has=(text,name)=>(' '+norm(text)+' ').includes(' '+norm(name)+' ');
const text=(v,max=180)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
const season=v=>typeof v==='string'&&/^20\d{2}(?:[/-](?:20\d{2}|\d{2}))?$/.test(v)?v:null;
const sameSeason=(a,b)=>{const n=v=>String(v||'').replace(/^(20\d{2})[/-](\d{2})$/,(_,y,e)=>y+'/'+y.slice(0,2)+e).replace('-','/');return season(a)&&season(b)&&n(a)===n(b);};
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)||!Number.isFinite(Date.parse(v)))return null;return new Date(v.slice(0,10)).toISOString().slice(0,10)===v.slice(0,10)?v.slice(0,10):null;};
const amount=v=>v!==''&&v!==null&&v!==undefined&&/^\d+(?:\.\d+)?$/.test(String(v))&&Number(v)<=100000000?Number(v):null;
function squadCandidates(raw,team,book,article){
 const d=raw?.details;
 if(!book||!d||d.type!=='team'||String(d.id)!==String(team.id)||identityName(d.name)!==identityName(team.name)||
   !['male','female'].includes(d.gender)||(d.gender==='male'?'men':'women')!==book.gender||
   d.country!==book.sourceCountry||!sameSeason(d.latestSeason,book.season))return [];
 const groups=raw.squad?.squad||raw.overview?.squad;
 if(!Array.isArray(groups)||groups.length>12)return [];
 const title=String(article.title||''),body=[title,article.summary,article.content].filter(Boolean).join('\n').slice(0,80000);
 const ownsHeadline=[team.name,...team.aliases||[]].some(n=>has(title,n));
 const rows=[],byId=new Map(),conflicts=new Set();
 for(const g of groups){
  if(!Array.isArray(g.members)||g.members.length>80)continue;
  for(const p of g.members){
   if(!PID.test(String(p?.id||''))||!text(p.name)||!Number.isInteger(p.positionId)||p.positionId<0||p.positionId>3)continue;
   const id=String(p.id),prev=byId.get(id);
   if(prev&&norm(prev.name)!==norm(p.name)){conflicts.add(id);continue;}
   byId.set(id,p);
  }
 }
 const surnameOwners=new Map();
 for(const p of byId.values()){const last=norm(p.name).split(' ').at(-1);const ids=surnameOwners.get(last)||new Set();ids.add(String(p.id));surnameOwners.set(last,ids);}
 for(const [id,p] of byId){
  if(conflicts.has(id))continue;
  const parts=p.name.split(/\s+/),aliases=[p.name];
  if(parts.length>2)aliases.push(parts[0]+' '+parts.at(-1));
  let matched=aliases.filter(a=>norm(a).split(' ').length>=2&&has(body,a));
  const last=parts.at(-1);
  // A lone surname only qualifies in the headline of this verified club's
  // story, is unique within its squad, and will be checked against the profile.
  if(ownsHeadline&&norm(last).length>=6&&surnameOwners.get(norm(last))?.size===1&&has(title,last))matched.push(last);
  if(!matched.length)continue;
  rows.push({id,name:p.name,aliases:[...new Set(matched)],birth_date:date(p.dateOfBirth),team,book});
 }
 return rows.slice(0,8);
}
function verifiedPlayerFacts(raw,candidate,now=Date.now()){
 const {team,book}=candidate,dob=date(raw?.birthDate?.utcTime);
 if(!raw||String(raw.id)!==candidate.id||norm(raw.name)!==norm(candidate.name)||raw.isCoach!==false||
   (raw.gender==='male'?'men':raw.gender==='female'?'women':null)!==book.gender||
   String(raw.primaryTeam?.teamId)!==String(team.id)||identityName(raw.primaryTeam?.teamName)!==identityName(team.name)||
   !dob||(candidate.birth_date&&dob!==candidate.birth_date)||Date.parse(dob)>now)return null;
 const fields=[];const add=(label,value)=>{if(value!==null&&value!==undefined&&value!=='')fields.push({label,value});};
 add('Date of birth',dob);
 const info=Array.isArray(raw.playerInformation)?raw.playerInformation.slice(0,20):[];
 for(const [title,label] of [['Height','Height'],['Preferred foot','Preferred foot'],['Country','Nationality'],['Shirt','Number'],['Contract end','Contract until']]){
  const row=info.find(i=>i?.title===title),v=row?.value;
  if(!v)continue;
  if(title==='Height'){const n=amount(v.numberValue);if(n>=100&&n<=240)add(label,n+' cm');}
  else if(title==='Shirt'){const n=amount(v.numberValue);if(Number.isInteger(n)&&n>=1&&n<=99)add(label,n);}
  else if(title==='Contract end')add(label,date(v.dateValue||raw.contractEnd?.utcTime));
  else add(label,text(v.fallback,100));
 }
 const role=raw.positionDescription?.primaryPosition?.label||raw.positionDescription?.primaryPosition?.name;
 add('Position',text(role,80));
 let competition=null;
 const league=raw.mainLeague;
 if(league&&String(league.leagueId)===book.sourceId&&season(league.season)&&Array.isArray(league.stats)){
  const stats=[];const labels=new Set();
  for(const r of league.stats.slice(0,25)){
   const label=text(r?.title,80),v=r?.value;
   if(!label||labels.has(label))continue;
   if(typeof v==='number'&&Number.isFinite(v)&&v>=0||typeof v==='string'&&/^\d+(?:\.\d+|\/\d+)?$/.test(v)){
    stats.push({label,value:v});labels.add(label);
   }
  }
  competition={name:text(league.leagueName)||book.sourceName,season:league.season,stats};
 }
 const career=[];
 const history=raw.careerHistory?.careerItems?.senior?.teamEntries;
 if(Array.isArray(history))for(const row of history.slice(0,50)){
  if(String(row.participantId)!==candidate.id||row.teamGender!==raw.gender||!text(row.team)||!date(row.startDate))continue;
  career.push({team:row.team,start:date(row.startDate),end:date(row.endDate),active:row.active===true,
   appearances:amount(row.appearances),goals:amount(row.goals),assists:amount(row.assists),uncertain:row.hasUncertainData===true,
   transfer_type:text(row.transferType?.text,60)});
 }
 return {id:candidate.id,name:raw.name,gender:book.gender,checked_at:new Date(now).toISOString(),
  team:{id:String(team.id),name:raw.primaryTeam.teamName,href:team.href,logo:team.logo||null},
  fields,competition,career,source:'FotMob',source_url:'https://www.fotmob.com/players/'+candidate.id,
  note:'Current source-recorded profile, separate from the publication date of this story. Missing statistics have not been inferred.'};
}
function createPlayerSourceReader({fetcher=fetch,clock=Date.now,timeoutMs=7000}={}){
 const cache=new Map(),inflight=new Map();let active=0,bytes=0;const queue=[];
 async function request(kind,id){
  if(active>=2){if(queue.length>=12)return null;await new Promise(r=>queue.push(r));}else active++;
  const controller=new AbortController();let timer,reader;
  try{
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('News player timeout'));},Math.min(Math.max(timeoutMs,1),10000));});
   const operation=(async()=>{
    const url=kind==='image'?'https://images.fotmob.com/image_resources/playerimages/'+id+'.png':
     'https://www.fotmob.com/api/data/'+(kind==='team'?'teams':'playerData')+'?id='+id;
    const response=await fetcher(url,{method:'GET',credentials:'omit',redirect:'error',headers:{Accept:kind==='image'?'image/png':'application/json','User-Agent':'NinkoSports-News-Identity/1.0'},signal:controller.signal});
    const limit=kind==='image'?1024*1024:5*1024*1024;
    if(response.status!==200||!new RegExp(kind==='image'?'^image/png':'^application/json','i').test(response.headers.get('content-type')||'')||Number(response.headers.get('content-length')||0)>limit)return null;
    reader=response.body.getReader();const parts=[];let size=0;
    while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>limit)return null;parts.push(Buffer.from(r.value));}
    const bytes=Buffer.concat(parts);
    if(kind==='image'){
     if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR')return null;
     const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);return w>=48&&w<=4096&&h>=48&&h<=4096?url:null;
    }
    return JSON.parse(bytes.toString('utf8'));
   })();
   return await Promise.race([operation,timeout]);
  }catch{return null;}finally{clearTimeout(timer);reader?.cancel().catch(()=>{});if(queue.length)queue.shift()();else active--;}
 }
 return async(kind,id)=>{
  if(!['team','player','image'].includes(kind)||!PID.test(String(id)))return null;
  const key=kind+':'+id,old=cache.get(key);if(old&&clock()<old.until)return old.data;
  if(inflight.has(key))return inflight.get(key);
  const promise=request(kind,id).then(data=>{
   const size=Buffer.byteLength(JSON.stringify(data));const prior=cache.get(key);if(prior)bytes-=prior.size;
   cache.delete(key);cache.set(key,{data,size,until:clock()+(data?900000:300000)});bytes+=size;
   while(cache.size>32||bytes>16*1024*1024){const first=cache.keys().next().value;bytes-=cache.get(first).size;cache.delete(first);}return data;
  }).finally(()=>inflight.delete(key));inflight.set(key,promise);return promise;
 };
}
async function addSquadPlayerLinks(article,teams,books,existing,{read,clock=Date.now}={}){
 if(!read||!article?.slug||article.sport!=='football')return {players:existing,partial:false};
 let partial=false;
 // Existing lineup-linked players remain available immediately and unchanged.
 // Only headline clubs are queried, within strict source and request caps.
 const target=teams.filter(t=>t.primary&&books.has(t.competition)&&PID.test(t.id)).slice(0,2);
 const squads=await Promise.all(target.map(async team=>{
  const raw=await read('team',team.id);if(!raw){partial=true;return [];}
  return squadCandidates(raw,team,books.get(team.competition),article);
 }));
 const identified=new Map(),owners=new Map();
 for(const p of existing)for(const name of [p.name,...p.aliases||[]]){const key=norm(name),set=owners.get(key)||new Set();set.add(p.id);owners.set(key,set);}
 for(const c of squads.flat())for(const name of c.aliases){const key=norm(name),set=owners.get(key)||new Set();set.add(c.id);owners.set(key,set);}
 for(const c of squads.flat())if(!existing.some(p=>p.id===c.id)&&c.aliases.every(n=>owners.get(norm(n))?.size===1))identified.set(c.id,c);
 const accepted=await Promise.all([...identified.values()].slice(0,3).map(async c=>{
  const raw=await read('player',c.id);if(!raw){partial=true;return null;}
  const facts=verifiedPlayerFacts(raw,c,clock());if(!facts)return null;
  facts.photo=await read('image',c.id);
  return {kind:'player',id:c.id,name:raw.name,aliases:c.aliases,team_id:c.team.id,competition:c.team.competition,
   href:'/football/players/'+c.id+'?article='+article.slug,profile:facts};
 }));
 return {players:[...existing,...accepted.filter(Boolean)].slice(0,16),partial};
}
module.exports={squadCandidates,verifiedPlayerFacts,createPlayerSourceReader,addSquadPlayerLinks};
