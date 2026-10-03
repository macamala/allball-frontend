'use strict';
/** Deliver data-only snapshots produced by the verified News refresh job. */
const {SPECS}=require('./newsRegionalTables.cjs');
const REGISTRY=Object.freeze({
 'serbia-prva-liga':{source:'official-prva-liga',origin:'https://www.prvaliga.rs',standings:'/sezona/tebela-takmicenja/',matches:'/sezona/raspored-i-rezultati/'},
 ...Object.fromEntries(Object.entries(SPECS).map(([key,s])=>[key,{source:s.source,origin:s.origin,standings:s.path}]))
});
const BASE='https://raw.githubusercontent.com/macamala/allball-frontend/news-official-data/';
const must=x=>{if(!x)throw Error('Official News snapshot failed validation');};
function validateSnapshot(raw,key,now=Date.now()){
 const spec=REGISTRY[key];must(spec&&raw?.version===1&&raw.competition===key&&raw.source===spec.source);
 const captured=Date.parse(raw.checked_at||'');must(Number.isFinite(captured)&&captured<=now+300000&&now-captured<86400000);
 const season=raw.standings?.season,m=/^(20\d{2})\/(20\d{2})$/.exec(season||'');must(m&&+m[2]===+m[1]+1&&now>=Date.UTC(+m[1],6,1)&&now<Date.UTC(+m[2],7,1));
 const stale=now-captured>=2*3600000;
 for(const view of ['standings',...(spec.matches?['matches']:[])]){
  const d=raw[view];must(d&&d.competition?.id===key&&d.competition?.sport==='football'&&d.sport==='football'&&d.source===spec.source&&d.source_url===spec.origin+spec[view]&&d.season===season&&d.updated_at===raw.checked_at);
  const rows=view==='standings'?d.rows:d.events;must(Array.isArray(rows)&&rows.length===(view==='standings'?16:240));
  const ids=new Set();for(const row of rows){
   if(view==='standings'){
    must(typeof row.team==='string'&&row.team.length>0&&typeof row.team_id==='string'&&!ids.has(row.team_id));ids.add(row.team_id);
    for(const field of ['rank','played','wins','draws','losses','goals_for','goals_against','goal_difference','points'])must(Number.isSafeInteger(row[field]));
    must(row.rank>=1&&row.rank<=16&&row.played===row.wins+row.draws+row.losses&&row.goal_difference===row.goals_for-row.goals_against);
    const image=new URL(row.logo);must(image.protocol==='https:'&&image.origin===spec.origin);
   }else{
    must(row.sport==='football'&&row.competition_key===key&&row.season===season&&typeof row.key==='string'&&row.key.startsWith('news-prva:')&&!ids.has(row.key)&&row.details_available===false);ids.add(row.key);
    must(['finished','scheduled','postponed','cancelled'].includes(row.status)&&Number.isFinite(Date.parse(row.start_time))&&row.home?.name&&row.away?.name);
    for(const side of ['home','away']){must(new URL(row[side].logo).origin===spec.origin);if(row.status==='finished')must(Number.isSafeInteger(row.score?.[side])&&row.score[side]>=0);else must(row.score?.[side]===null);}
   }
  }
 }
 return {raw,stale,captured};
}
function snapshotLoader({fetcher=fetch,clock=Date.now}={}){
 const cache=new Map(),pending=new Map();
 return async function load(key,view){
  const spec=REGISTRY[key];must(spec&&['standings','matches'].includes(view)&&spec[view]);const now=clock();
  const select=entry=>{const parsed=validateSnapshot(entry,key,now),d=entry[view];return {...d,stale:parsed.stale,coverage:{...d.coverage,stale:parsed.stale},_newsRead:{...d._newsRead,supplementary:true,snapshot:true,refreshMinutes:60,sourceCheckedAt:entry.checked_at}};};
  const old=cache.get(key);if(old&&now-old.readAt<60000)return select(old.data);
  if(pending.has(key))return select(await pending.get(key));
  const task=(async()=>{
   try{
    const r=await fetcher(BASE+key+'.json',{method:'GET',credentials:'omit',redirect:'error',headers:{Accept:'application/json,text/plain;q=0.9'},signal:AbortSignal.timeout(15000)});
    must(r.ok&&r.status===200&&/(?:application\/json|text\/plain)/.test(r.headers.get('content-type')||''));const reader=r.body.getReader(),parts=[];let total=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;must(total<2000000);parts.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
    const data=JSON.parse(Buffer.concat(parts).toString('utf8'));validateSnapshot(data,key,now);cache.set(key,{data,readAt:now});return data;
   }catch(error){if(old){validateSnapshot(old.data,key,now);return old.data;}throw error;}
   finally{pending.delete(key);}
  })();pending.set(key,task);return select(await task);
 };
}
module.exports={REGISTRY,validateSnapshot,snapshotLoader};
