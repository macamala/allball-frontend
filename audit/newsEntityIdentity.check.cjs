'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseNativeIdentity,qualifyNewsEvents,categoryOf,identityName,createNativeIdentityReader}=require('../server/newsEntityIdentity.cjs');
const {teamMentioned}=require('../server/newsEntityMention.cjs');
const {contextLoader,findTeams,genderFor,validReadPath}=require('../server/newsArticleContext.cjs');
const KEY='finland-veikkausliiga',NOW=Date.parse('2026-10-04T03:00:00Z');
const team=(id,name)=>({id,name});
const native=(extra={})=>({details:{id:51,name:'Veikkausliiga',country:'FIN',gender:'male',selectedSeason:'2026'},
 fixtures:{allMatches:[{id:101,home:team(162146,'Ilves'),away:team(162162,'SJK')},{id:102,home:team(8424,'FC Lahti'),away:team(10001,'HJK')}]},...extra});
const event=(id='e1',extra={})=>({id,sport:'football',competition_key:KEY,football_gender:'unknown',start_time:'2026-10-01T15:00:00Z',
 home:team('162146','Tampereen Ilves'),away:team('162162','SJK'),status:'finished',score:{home:0,away:2},...extra});
const article=(extra={})=>({id:19,slug:'club-confirms-news',sport:'football',league:KEY,title:'Ilves and SJK discuss next season',summary:'',content:'Both clubs discussed their plans.',published_at:'2026-10-03T13:00:00',...extra});
const book=()=>parseNativeIdentity(native(),KEY,NOW);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

test('native identity must match exact configured country, event id, name and gender',()=>{
 const good=book();assert.equal(good.sourceId,'51');assert.equal(good.gender,'men');assert.equal(good.teams.get('162146').name,'Ilves');
 assert.equal(good.season,'2026');assert.equal(good.teams.size,4);
 for(const patch of [{id:52},{country:'SWE'},{name:'Ykkosliiga'},{gender:null},{gender:'youth'},{selectedSeason:'guess'},{selectedSeason:null}])
  assert.equal(parseNativeIdentity(native({details:{...native().details,...patch}}),KEY,NOW),null);
 for(const key of ['https://example.test',KEY+'/../other','football-unknown','__proto__'])assert.equal(parseNativeIdentity(native(),key,NOW),null);
});
test('duplicate or conflicting native ids never become a guessed source identity',()=>{
 const raw=native();raw.fixtures.allMatches.push({id:109,home:team(162146,'Another club'),away:team(10001,'HJK')});
 const result=parseNativeIdentity(raw,KEY,NOW);assert(!result.teams.has('162146'));
 assert.equal(parseNativeIdentity(native({fixtures:{allMatches:[]}}),KEY,NOW),null);
 assert.equal(parseNativeIdentity(native({fixtures:{allMatches:[{id:'not-id',home:team(1,'A'),away:team(2,'B')}]}}),KEY,NOW),null);
});
test('category qualification requires both exact club ids and names without altering records',()=>{
 const e=event(),before=JSON.stringify(e),books=new Map([[KEY,book()]]);
 const output=qualifyNewsEvents([e],books);assert.equal(output.length,1);assert.equal(categoryOf(output[0]),'men');
 assert.equal(output[0].football_gender,'unknown');assert.equal(JSON.stringify(e),before);assert.equal(JSON.stringify(output[0]),before);
 const teams=findTeams(article(),output);assert.deepEqual(teams.map(t=>t.id).sort(),['162146','162162']);
 assert.equal(JSON.parse(JSON.stringify(output[0])).football_gender,'unknown');
});
test('another gender, age group, name or known conflicting club id cannot inherit mens category',()=>{
 const books=new Map([[KEY,book()]]);
 for(const patch of [{football_gender:'women'},{football_gender:'youth'},{sport:'basketball'},
  {home:team('136687','Ilves')},{home:team('162146','Other club')}])assert.deepEqual(qualifyNewsEvents([event('x',patch)],books),[]);
 const unknown=event('x',{home:team('999','Unknown FC')});assert.equal(categoryOf(qualifyNewsEvents([unknown],books)[0]),'unknown');
 const spoof=event('x',{news_gender:'men',_verified_category:'men',football_gender:'unknown'});
 assert.equal(categoryOf(qualifyNewsEvents([spoof],new Map())[0]),'unknown');
 assert.deepEqual(findTeams(article(),[spoof]),[]);
});
test('aliases preserve women, reserve and age suffixes; unsupported names never match',()=>{
 assert.equal(identityName('FK Crvena Zvezda'),'crvena zvezda');assert.equal(identityName('Red Star Belgrade'),'crvena zvezda');
 assert.equal(identityName('Bayer 04 Leverkusen'),identityName('Bayer Leverkusen'));
 for(const name of ['Ilves Women','Ilves II','Ilves B','Ilves U19'])assert.notEqual(identityName(name),identityName('Ilves'));
 assert.notEqual(identityName('Manchester City'),identityName('Manchester United'));
});
test('ordinary ready and player first name Rade never identify the unrelated Norwegian clubs',()=>{
 for(const raw of ['Rade Krunić returns to training and is ready for the match.','The players are ready to return.', 'Already preparing.']){
  assert.equal(teamMentioned(raw,'Ready'),false);assert.equal(teamMentioned(raw,'Råde'),false);
 }
 for(const raw of ['IF Ready confirms a signing',"Ready’s coach speaks"])assert(teamMentioned(raw,'Ready'));
 assert(teamMentioned('Råde appoints a coach','Råde'));assert(teamMentioned('FK Rade announces a player','Råde'));
});
test('geographic prose does not create country-team links, while match reporting still does',()=>{
 for(const raw of ['He moved from France to France.','They will train in Portugal.','Travelling through Canada.'])
  for(const country of ['France','Portugal','Canada'])assert.equal(teamMentioned(raw,country),false);
 assert(teamMentioned('Portugal will face Norway.','Portugal'));assert(teamMentioned('France appoint a new coach.','France'));
 assert(teamMentioned('The team plays in Portugal. Portugal named the squad.','Portugal'));
});
test('short club names require their exact uppercase form and cannot match arbitrary tokens',()=>{
 for(const name of ['PSG','PSV','SJK','HJK','QPR','AIK']){
  assert(teamMentioned(name+' discuss the squad',name));assert(!teamMentioned(name.toLowerCase()+' discuss the squad',name));
  assert(!teamMentioned(name+'Extra',name));
 }
 assert(!teamMentioned('ABC is written','ABC'));
});
test('Nice needs an explicit club relationship, not the ordinary adjective',()=>{
 assert(teamMentioned('Axel Witsel joins Nice to mentor younger players','Nice'));
 assert(teamMentioned('Nice appoint manager','Nice'));assert(!teamMentioned('The player says it is nice to win','Nice'));
});
test('mentoring youth development does not turn senior reporting into an academy fixture',()=>{
 assert.equal(genderFor(article({title:'Axel Witsel joins Nice',summary:'He will mentor youth development in the club.'})),'men');
 assert.equal(genderFor(article({title:'Ilves academy team wins match'})),'youth');
 assert.equal(genderFor(article({title:'Ilves U18 win match'})),'youth');
 assert.equal(genderFor(article({title:'Ilves women appoint manager'})),'women');
});
test('native identity reader uses a fixed source anonymously, coalesces, and caches successful metadata',async()=>{
 const calls=[];let now=NOW;
 const read=createNativeIdentityReader({clock:()=>now,fetcher:async(url,opts)=>{calls.push({url,opts});return json(native());}});
 const [a,b]=await Promise.all([read(KEY),read(KEY)]);assert.strictEqual(a,b);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://www.fotmob.com/api/data/leagues?id=51');
 assert.equal(calls[0].opts.method,'GET');assert.equal(calls[0].opts.credentials,'omit');assert.equal(calls[0].opts.redirect,'error');
 assert(!calls[0].opts.headers.Authorization&&!calls[0].opts.headers.Cookie);
 await read(KEY);assert.equal(calls.length,1);now+=7*3600000;await read(KEY);assert.equal(calls.length,2);
 assert.equal(await read('https://evil.test'),null);assert.equal(calls.length,2);
});
test('blocked, malformed and oversized native sources remain unknown with a cooldown, not retries',async()=>{
 for(const reply of [()=>json({},429),()=>json({},403),()=>new Response('<html>',{headers:{'Content-Type':'text/html'}}),
   ()=>json({details:{}}),()=>new Response('{}',{headers:{'Content-Type':'application/json','Content-Length':'9000000'}})]){
  let count=0,now=NOW;const read=createNativeIdentityReader({clock:()=>now,fetcher:async()=>{count++;return reply();}});
  assert.equal(await read(KEY),null);assert.equal(await read(KEY),null);assert.equal(count,1);
  now+=301000;assert.equal(await read(KEY),null);assert.equal(count,2);
 }
});
test('an uncooperative native fetch is bounded and cancellation is signalled',async()=>{
 let signal;const read=createNativeIdentityReader({timeoutMs:5,fetcher:async(_url,opts)=>{signal=opts.signal;return new Promise(()=>{});}});
 assert.equal(await read(KEY),null);assert.equal(signal.aborted,true);
});
test('native downloads never exceed two concurrent readers, with a bounded wait list',async()=>{
 let active=0,max=0;const spec=require('../server/newsEntitySources.json').specs;
 const read=createNativeIdentityReader({fetcher:async(url)=>{
  active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;
  const id=new URL(url).searchParams.get('id'),key=Object.keys(spec).find(k=>spec[k].id===id),s=spec[key];
  return json(native({details:{id:s.id,name:s.name,country:s.country,gender:'male',selectedSeason:'2026'}}));
 }});
 await Promise.all(Object.keys(spec).slice(0,20).map(k=>read(k)));assert(max<=2,max);
});
test('scoped team profile read cannot forward arbitrary urls, credentials or duplicated parameters',()=>{
 assert(validReadPath('/sports-data/teams/162146?sport=football&competition='+KEY+'&name=Ilves'));
 for(const suffix of ['&url=https://example.test','&sport=basketball','&name=Other'])
  assert(!validReadPath('/sports-data/teams/162146?sport=football&competition='+KEY+'&name=Ilves'+suffix));
 assert(!validReadPath('/sports-data/teams/162146?sport=football&competition=unknown&name=Ilves'));
 assert(!validReadPath('/sports-data/teams/../admin?sport=football&competition='+KEY+'&name=Ilves'));
});
test('source-confirmed club missing from public fixtures links only a verified same-id public profile',async()=>{
 const a=article({title:'Ilves confirms goalkeeper signing'}),seen=[];
 const profile={available:true,entity_key:'162146',sport:'football',football_gender:'unknown',team:team('162146','Ilves'),results:[event()],fixtures:[]};
 const read=async path=>{seen.push(path);if(path.startsWith('/articles/'))return a;
  if(path.startsWith('/sports-data/events?'))return {sport:'football',events:[],snapshot:{complete:true}};
  if(path.endsWith('/hub'))return {competition:{id:KEY},events:[]};
  if(path.startsWith('/sports-data/teams/'))return profile;
  if(path.startsWith('/sports-data/matches/'))return {id:'e1',event:event(),lineups:{}};
  throw Error('unexpected read');};
 const load=contextLoader({read,nativeRead:async()=>book(),clock:()=>NOW});
 const result=await load(a.slug);assert.equal(result.teams.length,1);assert.equal(result.teams[0].id,'162146');
 assert(result.teams[0].href.startsWith('/teams/162146?'));assert(result.matches.length>0);
 assert(seen.some(p=>p.includes('/teams/162146?')&&p.includes('competition='+KEY)));
 assert.equal(result.players.length,0);
});
test('wrong same-name profile id, sport, gender, absent data or incorrect name never creates a link',async()=>{
 for(const patch of [{team:team('136687','Ilves')},{entity_key:'136687'},{sport:'basketball'},
  {football_gender:'women'},{team:team('162146','Ilves Women')},{available:false},{fixtures:[],results:[]}]){
  const a=article({title:'Ilves confirms goalkeeper signing'}),profile={available:true,entity_key:'162146',sport:'football',team:team('162146','Ilves'),results:[event()],...patch};
  const read=async path=>{if(path.startsWith('/articles/'))return a;if(path.includes('/events?'))return {sport:'football',events:[]};if(path.endsWith('/hub'))return {competition:{id:KEY},events:[]};return profile;};
  const result=await contextLoader({read,nativeRead:async()=>book(),clock:()=>NOW})(a.slug);
  assert.equal(result.teams.length,0,JSON.stringify(patch));assert.equal(result.players.length,0);
 }
});
test('missing native access preserves verified known-category teams without inventing unknown ones',async()=>{
 const a=article(),e=event('e1',{football_gender:'men'});
 const read=async path=>{if(path.startsWith('/articles/'))return a;if(path.includes('/events?'))return {sport:'football',events:[e]};if(path.endsWith('/hub'))return {competition:{id:KEY},events:[]};return {id:e.id,event:e,lineups:{}};};
 const result=await contextLoader({read,nativeRead:async()=>null,clock:()=>NOW})(a.slug);assert.equal(result.teams.length,2);assert.equal(result.partial,true);assert.equal(result.players.length,0);
});
