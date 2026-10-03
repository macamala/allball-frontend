'use strict';
/** Public data ingestion for the existing News view. No writer or sporting DB. */
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {officialLoader,robotAllows,boundedText}=require('../server/newsDataServer.cjs');
const {SPECS,parseRegionalTable}=require('../server/newsRegionalTables.cjs');
const {validateSnapshot}=require('../server/newsSnapshotServer.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function refresh(output,{fetcher=fetch,clock=Date.now,wait=delay}={}){
 fs.mkdirSync(output,{recursive:true});const report={started_at:new Date(clock()).toISOString(),sources:[],AI_requests:0,sporting_database_writes:0};
 const keys=['serbia-prva-liga',...Object.keys(SPECS)];
 for(const key of keys){
  try{
   let standings,matches,proof;
   if(key==='serbia-prva-liga'){
    const loader=officialLoader({fetcher,clock});standings=await loader('standings');matches=await loader('matches');
    proof={policy_checked:true,source_urls:[standings.source_url,matches.source_url]};
   }else{
    const spec=SPECS[key],policy=await boundedText(fetcher,spec.origin+'/robots.txt',100000);
    if(!robotAllows(policy,spec.path))throw Error('Robots policy does not allow this source');
    // Respect the largest declared delay, never drop a site's crawl-delay.
    const delays=[...policy.matchAll(/^\s*crawl-delay\s*:\s*([\d.]+)\s*$/gim)].map(m=>Number(m[1]));
    const seconds=delays.length?Math.max(...delays):0;if(!Number.isFinite(seconds)||seconds>60)throw Error('Source crawl delay needs review');if(seconds)await wait(seconds*1000);
    const body=await boundedText(fetcher,spec.origin+spec.path,3000000);standings=parseRegionalTable(body,key,clock());
    proof={policy_checked:true,crawl_delay_seconds:seconds,source_urls:[standings.source_url],source_sha256:createHash('sha256').update(body).digest('hex')};
   }
   const checked=new Date(clock()).toISOString();for(const d of [standings,matches].filter(Boolean)){d.updated_at=checked;d.checked_at=checked;d._newsRead={...d._newsRead,readAt:checked,sourceCheckedAt:checked,snapshot:true,refreshMinutes:60};}
   const data={version:1,competition:key,source:standings.source,checked_at:checked,proof,standings,...(matches?{matches}:{})};validateSnapshot(data,key,clock());
   const destination=path.join(output,key+'.json'),tmp=destination+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data));fs.renameSync(tmp,destination);
   report.sources.push({key,status:'updated',checked_at:checked,table_rows:standings.rows.length,matches:matches?.events.length||0});
  }catch(error){report.sources.push({key,status:'failed',error:error.name+': '+error.message.slice(0,180)});}
 }
 report.finished_at=new Date(clock()).toISOString();return report;
}
if(require.main===module){const output=process.argv[2],reportFile=process.argv[3];if(!output||!reportFile)throw Error('Output directory and report path required');refresh(output).then(report=>{fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.sources.every(s=>s.status==='failed'))process.exitCode=1;}).catch(e=>{console.error(e.name);process.exitCode=1;});}
module.exports={refresh};
