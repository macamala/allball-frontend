'use strict';
/** Existing static frontend plus two allowlisted NEWS reads, never a general proxy. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const serve=require('serve-handler'),compress=require('node:util').promisify(require('compression')());
const {ORIGIN,PATHS,parseStandings,parseMatches}=require('./newsPrva.cjs');
const AGENT='NinkoSports-NewsData/1.0 (+https://ninkosports.com)';
function robotAllows(text,target){
 const groups=[];let agents=[],rules=[],sawRule=false;
 const flush=()=>{if(agents.length)groups.push({agents,rules});agents=[];rules=[];sawRule=false;};
 for(const line of text.split(/\r?\n/)){
  const row=line.split('#')[0].trim();if(!row)continue;const colon=row.indexOf(':');if(colon<0)throw Error('Unrecognised robots policy');
  const key=row.slice(0,colon).trim().toLowerCase(),value=row.slice(colon+1).trim();
  if(key==='user-agent'){if(sawRule)flush();agents.push(value.toLowerCase());}
  else if(['allow','disallow'].includes(key)){if(!agents.length)throw Error('Unscoped robots policy');rules.push({allow:key==='allow',value});sawRule=true;}
  else if(!['sitemap','crawl-delay','host'].includes(key))throw Error('Unreviewed robots policy');
 }
 flush();const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&AGENT.toLowerCase().startsWith(a))),chosen=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 let decision=true,length=-1;
 for(const group of chosen)for(const rule of group.rules){
  if(!rule.value)continue;const pattern='^'+rule.value.split('*').map(p=>p.replace(/[.+?^{}()|[\]\\]/g,'\\$&')).join('.*');
  if(new RegExp(pattern).test(target)&&(rule.value.length>length||rule.value.length===length&&rule.allow)){length=rule.value.length;decision=rule.allow;}
 }
 return decision;
}
async function boundedText(fetcher,url,limit){
 const response=await fetcher(url,{headers:{'User-Agent':AGENT,'Accept':'text/html,text/plain;q=0.9'},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok||response.status!==200||!/(?:text\/html|text\/plain)/i.test(response.headers.get('content-type')||''))throw Error('Official source unavailable');
 if(Number(response.headers.get('content-length')||0)>limit)throw Error('Official source size');
 const reader=response.body.getReader();let total=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit)throw Error('Official source size');parts.push(Buffer.from(value));}}
 finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(parts).toString('utf8');
}
function officialLoader({fetcher=fetch,clock=Date.now}={}){
 const cache=new Map(),pending=new Map();let robots=null,robotTask=null,blockedUntil=0;
 async function checkPolicy(){
  const now=clock();if(robots&&now-robots.at<3600000)return robots.text;
  if(!robotTask)robotTask=boundedText(fetcher,ORIGIN+'/robots.txt',100000).then(text=>{robots={text,at:clock()};return text;}).finally(()=>{robotTask=null;});
  return robotTask;
 }
 return async function load(view){
  if(!Object.hasOwn(PATHS,view))throw Error('Unknown News view');const saved=cache.get(view),now=clock();
  const retained=()=>saved&&now-saved.at<24*3600000?{...saved.data,stale:true,coverage:{...saved.data.coverage,stale:true},_newsRead:{...saved.data._newsRead,supplementUnavailable:true}}:null;
  if(saved&&now-saved.at<15*60000)return saved.data;
  if(now<blockedUntil){const old=retained();if(old)return old;throw Error('Official source cooldown');}
  if(pending.has(view))return pending.get(view);
  const task=(async()=>{
   try{const policy=await checkPolicy();if(!robotAllows(policy,PATHS[view]))throw Error('Official source policy');
    const raw=await boundedText(fetcher,ORIGIN+PATHS[view],3000000),data=(view==='standings'?parseStandings:parseMatches)(raw,clock());cache.set(view,{at:clock(),data});return data;
   }catch(error){blockedUntil=clock()+120000;const old=retained();if(old)return old;throw error;}
   finally{pending.delete(view);}
  })();pending.set(view,task);return task;
 };
}
function createNewsServer({root=path.resolve(__dirname,'../dist'),loader=officialLoader()}={}){
 let configured={};const file=path.resolve(__dirname,'../serve.json');if(fs.existsSync(file))configured=JSON.parse(fs.readFileSync(file,'utf8'));
 const config={...configured,public:root,rewrites:[{source:'**',destination:'/index.html'},...(configured.rewrites||[])]};
 return http.createServer(async(req,res)=>{
  try{await compress(req,res);}catch{res.statusCode=500;return res.end();}
  if((req.url||'').startsWith('/news-data/')){
   res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
   if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end(JSON.stringify({error:'method_not_allowed'}));}
   const match=/^\/news-data\/football\/serbia-prva-liga\/(standings|matches)$/.exec(req.url);
   if(!match){res.statusCode=404;return res.end(req.method==='HEAD'?'':JSON.stringify({error:'unknown_news_data_route'}));}
   try{const data=await loader(match[1]);res.statusCode=200;res.setHeader('Cache-Control','public, max-age=60');return res.end(req.method==='HEAD'?'':JSON.stringify(data));}
   catch{res.statusCode=503;res.setHeader('Retry-After','120');return res.end(req.method==='HEAD'?'':JSON.stringify({error:'official_news_data_temporarily_unavailable'}));}
  }
  try{await serve(req,res,config);}catch{if(!res.headersSent)res.statusCode=500;res.end();}
 });
}
if(require.main===module){
 const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 const server=createNewsServer();server.listen(port,'0.0.0.0',()=>console.log('NinkoSports frontend ready on',port));
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),10000).unref();});
}
module.exports={createNewsServer,officialLoader,robotAllows};
