/** Fixed same-origin News routes; never accepts a user-supplied upstream URL. */
import {newsMatches,scopedNewsData} from './newsFootballData.js';
import {sameNewsSeason} from './newsFootballView.js';
const cache=new Map();
export function clearOfficialNewsCache(){cache.clear();}
export async function loadOfficialNewsData(competition,view,{season='',range=null,signal,fetcher=globalThis.fetch,now=Date.now()}={}){
 if(competition!=='serbia-prva-liga'||!['fixtures','results','standings'].includes(view))return null;
 const type=view==='standings'?'standings':'matches',url='/news-data/football/serbia-prva-liga/'+type;
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 let data=cache.get(type)?.until>now?cache.get(type).data:null;
 if(!data){
  const controller=new AbortController();let timer,abort;
  const stop=new Promise((_,reject)=>{abort=()=>{controller.abort();reject(new DOMException('Cancelled','AbortError'));};signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>{controller.abort();reject(Error('Official News request timeout'));},20000);});
  try{
   data=await Promise.race([(async()=>{
    const r=await fetcher(url,{method:'GET',credentials:'omit',redirect:'error',signal:controller.signal});
    if(!r.ok||!(r.headers.get('content-type')||'').includes('json'))throw Error('Official News source unavailable');
    const body=await r.text();if(body.length>1000000)throw Error('Official News payload size');
    const d=JSON.parse(body);if(!scopedNewsData(d,competition)||d.source!=='official-prva-liga'||!Array.isArray(type==='standings'?d.rows:d.events))throw Error('Official News scope mismatch');
    if(type==='standings'&&d.rows.length!==16)throw Error('Incomplete official table');
    if(type==='matches'&&(d.events.length!==240||d.events.some(e=>e.sport!=='football'||e.competition_key!==competition)))throw Error('Incomplete official schedule');
    return d;
   })(),stop]);
   if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
   cache.set(type,{until:now+(data.stale?30000:300000),data});
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 if(season&&!sameNewsSeason(season,data.season))throw Error('Requested official season not available');
 if(type==='matches')return {...data,events:newsMatches(data,competition,{season,range}),_newsRead:{...data._newsRead,...(range?{rangeKey:range.key}:{})}};
 return data;
}
