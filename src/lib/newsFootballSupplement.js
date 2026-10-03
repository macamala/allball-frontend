/** Public supplements for NEWS ONLY. No credentials, AI or sporting writes. */
import {sameNewsSeason,seasonIdentity} from './newsFootballView.js';
import {loadOfficialNewsData} from './newsOfficialData.js';
import {loadNewsSourceMatches} from './newsFixtureSupplement.js';
export const NEWS_TABLE_SOURCES=Object.freeze({
 'uefa-euro':{slug:'uefa.euro',uid:'s:600~l:781',name:'UEFA European Championship',min:16,edition:true},
 'fifa-world-cup':{slug:'fifa.world',uid:'s:600~l:606',name:'FIFA World Cup',min:32,edition:true},
 'fifa-club-world-cup':{slug:'fifa.cwc',uid:'s:600~l:5501',name:'FIFA Club World Cup',min:16,edition:true},
 'fifa-womens-world-cup':{slug:'fifa.wwc',uid:'s:600~l:795',name:"FIFA Women's World Cup",min:24,edition:true},
 'uefa-womens-nations-league':{slug:'uefa.w.nations',uid:'s:600~l:23088',name:"UEFA Women's Nations League",min:40,edition:true},
 'uefa-under-21-euro':{slug:'uefa.euro_u21',uid:'s:600~l:5693',name:'UEFA European Under-21 Championship',min:16,edition:true},
 'uefa-champions-league':{slug:'uefa.champions',uid:'s:600~l:775',name:'UEFA Champions League',min:30},
 'uefa-womens-champions-league':{slug:'uefa.wchampions',uid:'s:600~l:19483',name:"UEFA Women's Champions League",min:16},
 'england-womens-super-league':{slug:'eng.w.1',uid:'s:600~l:8097',name:"English Women's Super League",country:'england',min:12,key:'womens-super-league'},
 'usa-nwsl':{slug:'usa.nwsl',uid:'s:600~l:8301',name:'NWSL',country:'us',min:12},
 'england-championship':{slug:'eng.2',uid:'s:600~l:3914',name:'English League Championship',country:'england',min:24},
 'spain-la-liga-2':{slug:'esp.2',uid:'s:600~l:3921',name:'Spanish LALIGA 2',country:'es',min:22},
 'italy-serie-b':{slug:'ita.2',uid:'s:600~l:3931',name:'Italian Serie B',country:'it',min:20},
 'greece-super-league':{slug:'gre.1',uid:'s:600~l:3955',name:'Greek Super League',country:'gr',min:14},
 'argentina-primera-nacional':{slug:'arg.2',uid:'s:600~l:3903',name:'Argentine Nacional B',country:'ar',min:30},
 'japan-j1-league':{slug:'jpn.1',uid:'s:600~l:750',name:'Japanese J.League',country:'jp',min:20,key:'japan-j1'},
 'australia-a-league-men':{slug:'aus.1',uid:'s:600~l:3906',name:'Australian A-League Men',country:'au',min:10,key:'australia-a-league'},
 'uefa-europa-league':{slug:'uefa.europa',uid:'s:600~l:776',name:'UEFA Europa League',min:30},
 'uefa-conference-league':{slug:'uefa.europa.conf',uid:'s:600~l:20296',name:'UEFA Conference League',min:30},
 'conmebol-libertadores':{slug:'conmebol.libertadores',uid:'s:600~l:783',name:'CONMEBOL Libertadores',min:16,key:'copa-libertadores'},
 'afc-champions-league-elite':{slug:'afc.champions',uid:'s:600~l:3902',name:'AFC Champions League Elite',min:20,key:'afc-champions-league'},
 'caf-champions-league':{slug:'caf.champions',uid:'s:600~l:2391',name:'CAF Champions League',min:16},
});
const ORIGIN='https://site.web.api.espn.com';
const checked=value=>{if(!value)throw Error('Unverified News source data');return value;};
const abortError=()=>new DOMException('Cancelled','AbortError');
const assertActive=signal=>{if(signal?.aborted)throw abortError();};
const stamp=value=>{const n=Date.parse(value||'');return Number.isFinite(n)?n:null;};
const logo=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&/(^|\.)espncdn\.com$/.test(u.hostname)?u.href:null;}catch{return null;}};
function stat(entry,name,{negative=false,optional=false}={}){
 const found=entry.stats.filter(s=>s?.name===name);if(!found.length&&optional)return undefined;
 checked(found.length===1&&typeof found[0].value==='number'&&Number.isInteger(found[0].value)&&(negative||found[0].value>=0));return found[0].value;
}
function explicitSeason(label){const m=String(label||'').match(/\b(20\d{2})(?:[/-](20\d{2}|\d{2}))?\b/);return m?seasonIdentity(m[0]):null;}
function compatibleSeason(label,selected){const found=explicitSeason(label);return !found||sameNewsSeason(found,selected)||(!found.includes('/')&&found===selected.split('/')[0]);}
export function newsTableSourceURL(competition,season=''){
 const spec=NEWS_TABLE_SOURCES[competition];if(!spec)return null;
 if(season&&!/^20\d{2}(?:[/-](?:20\d{2}|\d{2}))?$/.test(season))throw Error('Unsupported News season');
 const query=new URLSearchParams();if(season)query.set('season',seasonIdentity(season).split('/')[0]);
 return `${ORIGIN}/apis/v2/sports/soccer/${spec.slug}/standings${query.size?'?'+query:''}`;
}
export function parseNewsSourceTable(raw,competition,{season='',now=Date.now()}={}){
 const spec=checked(NEWS_TABLE_SOURCES[competition]);checked(raw?.uid===spec.uid&&raw?.name===spec.name&&Array.isArray(raw.children));
 const sourceSeason=checked(raw.season),begins=stamp(sourceSeason.startDate),ends=stamp(sourceSeason.endDate);
 checked(begins!==null&&ends!==null&&begins<ends&&Number.isInteger(sourceSeason.year));
 const rootSeason=checked(explicitSeason(sourceSeason.displayName));checked(Number(rootSeason.split('/')[0])===sourceSeason.year);
 const labels=new Set(raw.children.map(g=>explicitSeason(g.abbreviation)).filter(s=>s?.includes('/')));
 const selected=!rootSeason.includes('/')&&labels.size===1?[...labels][0]:rootSeason;
 checked(compatibleSeason(sourceSeason.displayName,selected));if(season)checked(sameNewsSeason(selected,season));
 if(!season)checked(now>=begins&&(now<=ends+7*86400000||(spec.edition&&now-ends<6*366*86400000)));
 const rows=[],groupKeys=new Set();checked(raw.children.length>0&&raw.children.length<=32);
 for(const group of raw.children){
  const table=checked(group.standings),entries=checked(table.entries);
  checked(typeof group.name==='string'&&group.name&&!groupKeys.has(group.uid));groupKeys.add(group.uid);checked(group.uid?.startsWith(spec.uid+'~g:'));
  checked(Array.isArray(entries)&&entries.length>0&&entries.length<=64&&table.season===sourceSeason.year);
  checked(compatibleSeason(group.name,selected)&&compatibleSeason(group.abbreviation,selected)&&compatibleSeason(table.seasonDisplayName,selected));
  checked((table.links||[]).some(link=>{try{const u=new URL(link.href);return u.protocol==='https:'&&/(^|\.)espn\.com$/.test(u.hostname)&&u.pathname.includes(`/league/${spec.slug}`);}catch{return false;}}));
  const ids=new Set(),ranks=new Set();
  for(const entry of entries){
   const team=checked(entry.team);checked(/^\d+$/.test(team.id)&&team.uid===`s:600~t:${team.id}`&&team.displayName&&!ids.has(team.id)&&Array.isArray(entry.stats));ids.add(team.id);
   const rank=stat(entry,'rank'),played=stat(entry,'gamesPlayed'),wins=stat(entry,'wins'),draws=stat(entry,'ties'),losses=stat(entry,'losses');
   checked(rank>0&&rank<=entries.length&&!ranks.has(rank));ranks.add(rank);checked(played===wins+draws+losses);
   const goalsFor=stat(entry,'pointsFor'),goalsAgainst=stat(entry,'pointsAgainst'),difference=stat(entry,'pointDifferential',{negative:true});checked(difference===goalsFor-goalsAgainst);
   const row={rank,team:team.displayName,team_id:`news-espn:${team.id}`,logo:(team.logos||[]).map(p=>logo(p.href)).find(Boolean)||null,played,wins,draws,losses,goals_for:goalsFor,goals_against:goalsAgainst,goal_difference:difference,points:stat(entry,'points',{negative:true}),group:raw.children.length>1?group.name:null,stage:table.seasonType!=null?String(table.seasonDisplayName||group.name):null,season:selected,country_id:spec.country||null};
   const deduction=stat(entry,'deductions',{negative:true,optional:true});if(deduction!==undefined)row.points_deduction=deduction;rows.push(row);
  }
 }
 checked(rows.length>=spec.min&&rows.length<=256);
 const available=[...new Set((raw.seasons||[]).map(s=>explicitSeason(s.displayName)).filter(Boolean))];
 return {competition:{id:spec.key||competition,name:spec.name,sport:'football',country_id:spec.country||null},sport:'football',season:selected,seasons:[...new Set([selected,...available])],rows,available:true,updated_at:new Date(now).toISOString(),stale:false,source:'espn-public-standings',source_url:newsTableSourceURL(competition,season),_newsRead:{readAt:new Date(now).toISOString(),sourceUpdatedAt:null,sourceSeasonLabel:sourceSeason.displayName,edition:Boolean(spec.edition),historical:ends<now,supplementary:true,scope:'publisher_reported_standings',completeSeasonCoverageVerified:false}};
}
const recent=new Map(),MAX_KEYS=64,FRESH=300000,BACKOFF=120000;
export function clearNewsSupplementCache(){recent.clear();}
export async function loadNewsSupplement(competition,view,{season='',signal,now=Date.now(),fetcher=globalThis.fetch,range=null}={}){
 if(competition==='serbia-prva-liga')return loadOfficialNewsData(competition,view,{season,range,signal,now,fetcher});
 if(!NEWS_TABLE_SOURCES[competition])return null;
 if(view!=='standings'){
  if(!['fixtures','results'].includes(view))return null;
  return loadNewsSourceMatches(competition,NEWS_TABLE_SOURCES[competition],{season,range,signal,now,fetcher},()=>loadNewsSupplement(competition,'standings',{season,signal,now,fetcher}));
 }
 const url=newsTableSourceURL(competition,season);assertActive(signal);const saved=recent.get(url);
 if(saved?.until>now){if(saved.error)throw Error(saved.error);return saved.data;}
 const controller=new AbortController();let timer,aborted;
 const stopped=new Promise((_,reject)=>{aborted=()=>{controller.abort();reject(abortError());};signal?.addEventListener('abort',aborted,{once:true});timer=setTimeout(()=>{controller.abort();reject(Error('News source timeout'));},10000);});
 const read=async url=>{const r=await fetcher(url,{method:'GET',mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});checked(r.ok&&r.status===200&&(r.headers.get('content-type')||'').includes('json'));if(r.headers.get('content-length'))checked(Number(r.headers.get('content-length'))<=2000000);const text=await r.text();checked(text.length<=2000000);return JSON.parse(text);};
 try{
  const operation=(async()=>{
   const raw=await read(url);
   try{return parseNewsSourceTable(raw,competition,{season,now});}
   catch(original){
    // Never relabel last-season CAF groups using the current wrapper's year.
    const spec=NEWS_TABLE_SOURCES[competition],labels=new Set((raw?.children||[]).map(g=>explicitSeason(g.name)).filter(Boolean)),previous=[...labels][0];
    if(competition!=='caf-champions-league'||season||raw.uid!==spec.uid||raw.name!==spec.name||labels.size!==1||!previous?.includes('/')||Number(previous.split('/')[0])!==raw.season?.year-1)throw original;
    const archive=parseNewsSourceTable(await read(newsTableSourceURL(competition,previous)),competition,{season:previous,now});checked(archive._newsRead.historical);
    return {...archive,_newsRead:{...archive._newsRead,edition:true,currentEditionUnavailable:true}};
   }
  })();
  const data=await Promise.race([operation,stopped]);assertActive(signal);recent.set(url,{data,until:now+FRESH});while(recent.size>MAX_KEYS)recent.delete(recent.keys().next().value);return data;
 }catch(error){if(!signal?.aborted)recent.set(url,{error:error.message,until:now+BACKOFF});while(recent.size>MAX_KEYS)recent.delete(recent.keys().next().value);throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',aborted);}
}
