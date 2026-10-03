'use strict';
/** Fixed public-source reads for the existing NEWS data server. No credentials or sporting writes. */
const {SOURCES,parseRegionalTable}=require('./newsRegional.cjs');
const AGENT='NinkoSports-NewsData/1.0 (+https://ninkosports.com)';
const fail=code=>Object.assign(Error('Regional News source unavailable'),{code});
const FRESH=15*60000,RETAIN=24*3600000,COOLDOWN=120000;
function allowedPath(key,url){
 const s=Object.hasOwn(SOURCES,key)?SOURCES[key]:null;if(!s)return false;
 let u;try{u=new URL(url);}catch{return false;}
 if(u.origin!==s.origin||u.username||u.password||u.hash)return false;
 if(u.pathname==='/robots.txt')return u.search==='';
 if(s.parser==='czech')return /^\/tabulka(?:\/20\d{2})?\/?$/.test(u.pathname)&&!u.search;
 if(s.parser==='austria')return /^\/(?:de\/)?tabelle(?:\/saison-20\d{2}-20\d{2})?\/?$/.test(u.pathname)&&!u.search;
 if(s.parser==='turkey')return u.pathname==='/default.aspx'&&u.search==='?pageID=142';
 if(s.parser==='serbia')return /^\/league\/\d+-mozzart-bet-prva-liga-srbije(?:\/table)?\/?$/.test(u.pathname)&&!u.search;
 return false;
}
function declaredCharset(type){
 const match=/charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i.exec(type||'');
 const name=(match?.[1]||'utf-8').toLowerCase();
 if(!['utf-8','utf8','windows-1254','iso-8859-9'].includes(name))throw fail('UNSUPPORTED_ENCODING');
 return name;
}
async function readText(fetcher,key,url,{limit=4000000,robots=false,permit=()=>true}={}){
 for(let hop=0;hop<=2;hop++){
  if(!allowedPath(key,url)||!permit(new URL(url).pathname+new URL(url).search))throw fail('SOURCE_PATH_DENIED');
  const r=await fetcher(url,{method:'GET',headers:{'User-Agent':AGENT,'Accept':'text/html,text/plain;q=0.9'},credentials:'omit',redirect:'manual',signal:AbortSignal.timeout(15000)});
  if([301,302,307,308].includes(r.status)){
   const location=r.headers.get('location');await r.body?.cancel().catch(()=>{});
   if(!location||hop===2)throw fail('SOURCE_REDIRECT');
   url=new URL(location,url).href;continue;
  }
  if(robots&&[404,410].includes(r.status)){await r.body?.cancel().catch(()=>{});return {text:'',url,status:r.status};}
  const type=r.headers.get('content-type')||'';
  if(!r.ok||r.status!==200||!/^text\/(?:html|plain)(?:\s*;|$)/i.test(type)){
   await r.body?.cancel().catch(()=>{});throw Object.assign(fail('UPSTREAM_RESPONSE'),{upstreamStatus:r.status});
  }
  if(Number(r.headers.get('content-length')||0)>limit){await r.body?.cancel().catch(()=>{});throw fail('SOURCE_SIZE');}
  const parts=[];let size=0;const reader=r.body.getReader();
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw fail('SOURCE_SIZE');parts.push(Buffer.from(value));}}
  finally{await reader.cancel().catch(()=>{});}
  const charset=robots?'utf-8':declaredCharset(type);
  const text=new TextDecoder(charset,{fatal:true}).decode(Buffer.concat(parts));
  if(robots&&(/<html\b/i.test(text)||/^text\/html/i.test(type)))throw fail('ROBOTS_NOT_TEXT');
  return {text,url,status:r.status};
 }
 throw fail('SOURCE_REDIRECT');
}
function policyDelay(text){
 const delays=[...text.matchAll(/^\s*crawl-delay\s*:\s*(\d+(?:\.\d+)?)\s*$/gim)].map(m=>Number(m[1])*1000);
 const delay=Math.max(0,...delays);if(delay>30000)throw fail('SOURCE_DELAY_UNSUPPORTED');return delay;
}
function regionalLoader({fetcher=fetch,clock=Date.now,robotAllows,logger=console.warn,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(typeof robotAllows!=='function')throw TypeError('A source-policy checker is required');
 const cache=new Map(),pending=new Map(),policies=new Map(),cooldowns=new Map(),lastRead=new Map();
 return async function load(key){
  if(!Object.hasOwn(SOURCES,key))throw fail('UNKNOWN_SOURCE');
  const now=clock(),saved=cache.get(key);
  const retained=()=>saved&&now>=saved.at&&now-saved.at<RETAIN?{...saved.data,stale:true,_newsRead:{...saved.data._newsRead,supplementUnavailable:true}}:null;
  if(saved&&now>=saved.at&&now-saved.at<FRESH)return saved.data;
  if(pending.has(key))return pending.get(key);
  if(now<(cooldowns.get(key)||0)){const data=retained();if(data)return data;throw fail('SOURCE_COOLDOWN');}
  const task=(async()=>{
   let stage='robots';
   try{
    const spec=SOURCES[key],origin=spec.origin;let policy=policies.get(origin);
    if(!policy||clock()-policy.at>=3600000||clock()<policy.at){
     const r=await readText(fetcher,key,origin+'/robots.txt',{robots:true,limit:100000});
     policy={text:r.text,at:clock(),delay:policyDelay(r.text)};policies.set(origin,policy);lastRead.set(origin,clock());
    }
    stage='policy';const permit=target=>robotAllows(policy.text,target);
    if(!permit(spec.path))throw fail('SOURCE_POLICY');
    const pause=Math.max(0,policy.delay-(clock()-(lastRead.get(origin)||0)));if(pause)await sleep(pause);
    stage='fetch';lastRead.set(origin,clock());
    const raw=await readText(fetcher,key,origin+spec.path,{permit});
    stage='parse';const data=parseRegionalTable(raw.text,key,clock());data.source_url=raw.url;
    cache.set(key,{at:clock(),data});return data;
   }catch(e){
    cooldowns.set(key,clock()+COOLDOWN);
    const code=x=>typeof x==='string'&&/^[A-Z0-9_]{1,60}$/.test(x)?x:null;
    logger(JSON.stringify({event:'news_regional_source_failure',competition:key,stage,code:code(e.code),causeCode:code(e.cause?.code),upstreamStatus:Number.isInteger(e.upstreamStatus)?e.upstreamStatus:null}));
    const data=retained();if(data)return data;throw e;
   }finally{pending.delete(key);}
  })();pending.set(key,task);return task;
 };
}
module.exports={regionalLoader,allowedPath,readText,declaredCharset,policyDelay};
