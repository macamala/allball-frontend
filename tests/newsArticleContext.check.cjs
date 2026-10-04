'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {contextLoader,createPublicReader,findTeams,lineupPlayers,findPlayers,compatibleEvent,genderFor}=require('../server/newsArticleContext.cjs');
const {createNewsServer}=require('../server/newsDataServer.cjs');
const a={id:1,slug:'football-story',sport:'football',league:'uefa-nations-league',title:'Bruno Fernandes calls for Portugal unity',summary:'Cristiano Ronaldo discusses the Portugal squad.',content:'Portugal played Norway and Denmark.',published_at:'2026-10-03T20:00:00'};
const event=(id='match-1',extra={})=>({id,sport:'football',football_gender:'men',competition_key:'uefa-nations-league',competition_name:'UEFA Nations League',home:{id:'8492',name:'Norway'},away:{id:'8361',name:'Portugal'},start_time:'2026-10-01T18:45:00Z',status:'finished',...extra});
const detail=(e,extra={})=>({id:e.id,event:e,lineups:{home:{start:[]},away:{start:[{id:422685,name:'Bruno Fernandes',number:8},{id:30893,name:'Cristiano Ronaldo',number:7}]}},...extra});

test('teams use their verified IDs and exact competition, never name-only unscoped profiles',()=>{
 const teams=findTeams(a,[event()]);assert.equal(teams.length,2);
 const pt=teams.find(t=>t.name==='Portugal');assert.match(pt.href,/^\/teams\/8361\?/);assert.equal(new URL(pt.href,'https://ninkosports.com').searchParams.get('competition'),'uefa-nations-league');
});
test('another gender, youth or unknown-category matches cannot identify mens teams',()=>{
 for(const g of ['women','youth','unknown',null])assert.deepEqual(findTeams(a,[event('wrong',{football_gender:g})]),[]);
 assert.equal(genderFor({...a,title:'Portugal women name squad'}),'women');
 assert.equal(genderFor({...a,title:'Portugal U21 name squad'}),'youth');
});
test('women names and numeric IDs remain separately scoped even when a source omits team suffixes',()=>{
 const e=event('women',{football_gender:'women',competition_key:'uefa-womens-nations-league'});
 const teams=findTeams({...a,league:'uefa-womens-nations-league',title:'Portugal women call up squad'},[e,event()]);
 assert(teams.every(t=>t.gender==='women'&&t.competition==='uefa-womens-nations-league'));
});
test('conflicting canonical identities sharing one name do not create arbitrary links',()=>{
 const teams=findTeams(a,[event(),event('alias',{away:{id:'conflict',name:'Portugal'}})]);
 assert(!teams.some(t=>t.name==='Portugal'));
});
test('fixture identities with missing keys, another sport, or malformed dates are excluded',()=>{
 for(const patch of [{id:'../admin'},{sport:'basketball'},{competition_key:''},{start_time:'invalid'},{home:{name:'Norway'}}])assert.equal(compatibleEvent(event('a',patch),'men'),false);
});
test('only exact matched event lineups establish players; generic metadata is not a squad',()=>{
 const e=event();assert.equal(lineupPlayers(detail(e),e).length,2);
 for(const bad of [detail(e,{id:'another'}),detail(e,{event:{...e,sport:'basketball'}}),detail(e,{event:{...e,competition_key:'other'}}),detail(e,{event:{...e,away:{id:'wrong',name:'Portugal'}}})])assert.deepEqual(lineupPlayers(bad,e),[]);
 assert.deepEqual(lineupPlayers(detail(e,{lineups:{home:{coach:{id:1,name:'Bruno Fernandes'}}}}),e),[]);
});
test('a full article name plus an exact lineup ID opens the existing enriched player profile',()=>{
 const e=event(),players=findPlayers(a,lineupPlayers(detail(e),e));assert.equal(players.length,2);
 const p=players.find(p=>p.id==='422685');assert.equal(p.name,'Bruno Fernandes');
 const url=new URL(p.href,'https://ninkosports.com');assert.equal(url.pathname,'/players/422685');assert.equal(url.searchParams.get('event_id'),e.id);
});
test('a surname alone and a same-name pair are not sufficient player identities',()=>{
 const e=event(),players=lineupPlayers(detail(e),e);
 assert.deepEqual(findPlayers({...a,title:'Fernandes discusses football',summary:'',content:''},players),[]);
 assert(!findPlayers(a,[...players,{...players[0],id:'conflict'}]).some(p=>p.name==='Bruno Fernandes'));
});
test('context builds from public records and coalesces repeated requests',async()=>{
 const reads=[];const e=event();const read=async path=>{reads.push(path);if(path.startsWith('/articles/'))return a;if(path.startsWith('/sports-data/events?'))return {sport:'football',events:[e],snapshot:{complete:true}};if(path.includes('/hub'))return {competition:{id:a.league},events:[]};if(path.includes('/matches/'))return detail(e);throw Error('unexpected');};
 const load=contextLoader({read,clock:()=>Date.parse('2026-10-04T00:00Z')});const [x,y]=await Promise.all([load(a.slug),load(a.slug)]);
 assert.strictEqual(x,y);assert.equal(x.players.length,2);assert.equal(x.matches[0].href,'/scores/event/match-1');assert.equal(reads.filter(p=>p.startsWith('/articles')).length,1);
 assert.equal(x.read_only,true);assert.equal(x.slug,a.slug);assert(!JSON.stringify(x).includes('source_url'));
});
test('invalid slugs never become public API requests',async()=>{
 const calls=[];const load=contextLoader({read:async p=>calls.push(p)});
 for(const slug of ['../admin','//host','a?key=secret','x%2Fy','x'.repeat(300)])await assert.rejects(()=>load(slug));
 assert.equal(calls.length,0);
});
test('mismatched article or nonfootball event reply fails closed, not as clickable generic profiles',async()=>{
 for(const wrong of [{...a,slug:'other'},{...a,sport:'basketball'},{...a,sport_match_ok:false}])await assert.rejects(()=>contextLoader({read:async()=>wrong})(a.slug));
 await assert.rejects(()=>contextLoader({read:async p=>p.startsWith('/articles')?a:{sport:'basketball',events:[event()]}})(a.slug));
});
test('failed lineup reads preserve valid team links but invent no players',async()=>{
 const read=async p=>{if(p.startsWith('/articles'))return a;if(p.includes('/events?'))return {sport:'football',events:[event()]};throw Error('offline');};
 const d=await contextLoader({read})(a.slug);assert.equal(d.teams.length,2);assert.equal(d.players.length,0);assert.equal(d.partial,true);
});
test('HTTP context endpoint is GET/HEAD only, exact path, with no arbitrary upstream query passthrough',async()=>{
 const calls=[];const server=createNewsServer({articleContext:async slug=>{calls.push(slug);return {slug,article_id:1};}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const path='/news-data/football/articles/football-story/context';let r=await fetch(base+path);assert.equal(r.status,200);assert.equal((await r.json()).slug,'football-story');
  r=await fetch(base+path,{method:'POST'});assert.equal(r.status,405);
  r=await fetch(base+path+'?url=https://evil.test');assert.equal(r.status,404);
  r=await fetch(base+'/news-data/football/articles/%2fadmin/context');assert.equal(r.status,404);
  assert.deepEqual(calls,['football-story']);
 }finally{await new Promise(r=>server.close(r));}
});
test('public reader uses no credentials, enforces response types and coalesces downloads',async()=>{
 const calls=[];const fetcher=async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify({sport:'football',events:[]}),{headers:{'Content-Type':'application/json'}});};
 const read=createPublicReader({fetcher});await Promise.all([read('/sports-data/events?sport=football'),read('/sports-data/events?sport=football')]);
 assert.equal(calls.length,1);assert.equal(calls[0].opts.method,'GET');assert.equal(calls[0].opts.credentials,'omit');assert.equal(calls[0].opts.redirect,'error');assert(calls[0].url.startsWith('https://allball-backend-production.up.railway.app/'));
 await assert.rejects(()=>read('https://evil.test/'));await assert.rejects(()=>createPublicReader({fetcher:async()=>new Response('<html/>',{headers:{'Content-Type':'text/html'}})})('/articles/test'));
});

test('a temporary upstream timeout retries once and concurrent readers share the repair',async()=>{
 let calls=0;const read=createPublicReader({sleep:async()=>{},fetcher:async()=>{
  if(++calls===1)throw new DOMException('timeout','TimeoutError');
  return new Response(JSON.stringify({id:1}),{headers:{'Content-Type':'application/json'}});
 }});
 const [a,b]=await Promise.all([read('/articles/football-story'),read('/articles/football-story')]);
 assert.deepEqual(a,{id:1});assert.strictEqual(a,b);assert.equal(calls,2);
 await read('/articles/football-story');assert.equal(calls,2);
});
test('permanent, rate-limited, malformed and oversized responses never retry or enter cache',async()=>{
 for(const reply of [()=>new Response('{}',{status:404}),()=>new Response('{}',{status:429}),
   ()=>new Response('<html>',{headers:{'Content-Type':'text/html'}}),
   ()=>new Response('{',{headers:{'Content-Type':'application/json'}}),
   ()=>new Response('{}',{headers:{'Content-Type':'application/json','Content-Length':'9000000'}})]){
  let calls=0;const read=createPublicReader({sleep:async()=>{},fetcher:async()=>{calls++;return reply();}});
  await assert.rejects(()=>read('/articles/football-story'));assert.equal(calls,1);
  await assert.rejects(()=>read('/articles/football-story'));assert.equal(calls,2);
 }
});
test('one bounded retry cannot hang the reader when an upstream ignores cancellation',async()=>{
 const signals=[];const read=createPublicReader({timeoutMs:5,sleep:async()=>{},fetcher:async(_url,opts)=>{
  signals.push(opts.signal);return new Promise(()=>{});
 }});
 await assert.rejects(()=>read('/articles/football-story'),{name:'TimeoutError'});
 assert.equal(signals.length,2);assert(signals.every(s=>s.aborted));
});
test('transient HTTP failure recovers without modifying the accepted response',async()=>{
 let calls=0;const read=createPublicReader({sleep:async()=>{},fetcher:async()=>++calls===1?
   new Response('{}',{status:503}):new Response('{"value":0}',{headers:{'Content-Type':'application/json'}})});
 assert.deepEqual(await read('/articles/football-story'),{value:0});assert.equal(calls,2);
});
test('upstream allowlist rejects prefix matches, duplicate params, traversal and arbitrary query data',async()=>{
 let calls=0;const read=createPublicReader({fetcher:async()=>{calls++;throw Error('unexpected');}});
 for(const path of ['/articles/foo/../admin','/articles/foo?token=anything','/sports-data/events?sport=basketball',
   '/sports-data/events?sport=football&sport=basketball','/sports-data/events?sport=football&url=https://example.test',
   '/sports-data/events?sport=football&date_from=2026-10-05&date_to=2026-10-01',
   '/sports-data/matches/..','/sports-data/matches/example/extra','/sports-data/competitions/foo/hub-extra'])
  await assert.rejects(()=>read(path));
 assert.equal(calls,0);
});
