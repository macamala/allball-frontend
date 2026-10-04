'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {squadCandidates,verifiedPlayerFacts,createPlayerSourceReader,addSquadPlayerLinks}=require('../server/newsPlayerFacts.cjs');
const NOW=Date.parse('2026-10-04T04:00:00Z');
const team={id:'8687',name:'Crvena zvezda',aliases:['Crvena Zvezda'],primary:true,competition:'serbia-superliga',href:'/teams/8687?sport=football&name=Crvena+zvezda'};
const book={sourceId:'182',sourceCountry:'SRB',gender:'men',sourceName:'Super Liga',season:'2026/2027'};
const article={id:19,sport:'football',slug:'player-returns',title:'Rade Krunić returns to Crvena zvezda',summary:'',content:'Rade Krunić returned to training.'};
const member=(extra={})=>({id:438456,name:'Rade Krunić',positionId:2,dateOfBirth:'1993-10-07',...extra});
const rawSquad=()=>({details:{id:8687,type:'team',name:'FK Crvena Zvezda',gender:'male',country:'SRB',latestSeason:'2026/2027'},squad:{squad:[{members:[member()]}]}});
const rawPlayer=()=>({id:438456,name:'Rade Krunić',isCoach:false,gender:'male',primaryTeam:{teamId:8687,teamName:'FK Crvena Zvezda'},birthDate:{utcTime:'1993-10-07T00:00:00Z'},
 playerInformation:[{title:'Height',value:{numberValue:184}},{title:'Country',value:{fallback:'Bosnia and Herzegovina'}},{title:'Preferred foot',value:{fallback:'Both'}},{title:'Shirt',value:{numberValue:33}}],
 positionDescription:{primaryPosition:{label:'Midfielder'}},mainLeague:{leagueId:182,leagueName:'Super Liga',season:'2026/2027',stats:[{title:'Goals',value:1},{title:'Assists',value:0},{title:'Missing',value:null}]},
 careerHistory:{careerItems:{senior:{teamEntries:[{participantId:438456,teamId:8687,team:'FK Crvena Zvezda',teamGender:'male',startDate:'2024-09-03',endDate:null,active:true,appearances:'83',goals:'9',assists:undefined}]}}}});
const candidate=()=>squadCandidates(rawSquad(),team,book,article)[0];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

test('exact squad and independent player profile agree on name id birth date team and gender',()=>{
 const c=candidate();assert.equal(c.id,'438456');const raw=rawPlayer(),before=JSON.stringify(raw);
 const profile=verifiedPlayerFacts(raw,c,NOW);assert.equal(profile.name,'Rade Krunić');assert.equal(profile.id,'438456');
 assert.equal(profile.team.id,'8687');assert.equal(profile.fields.find(r=>r.label==='Height').value,'184 cm');
 assert.deepEqual(profile.competition.stats,[{label:'Goals',value:1},{label:'Assists',value:0}]);assert.equal(profile.career[0].assists,null);
 assert.equal(JSON.stringify(raw),before);assert.equal(profile.checked_at,'2026-10-04T04:00:00.000Z');
});
test('squad association cannot be taken from another country team gender season or a coach',()=>{
 for(const details of [{id:1},{name:'Other club'},{gender:'female'},{country:'BRA'},{latestSeason:'2022/2023'},{type:'league'}]){
  const raw=rawSquad();Object.assign(raw.details,details);assert.deepEqual(squadCandidates(raw,team,book,article),[]);
 }
 for(const m of [member({positionId:4}),member({id:'../admin'}),member({name:'Another Player'})]){
  const raw=rawSquad();raw.squad.squad[0].members=[m];assert.deepEqual(squadCandidates(raw,team,book,article),[]);
 }
 const raw=rawSquad();raw.details.latestSeason='2026-2027';assert.equal(squadCandidates(raw,team,book,article).length,1);
});
test('related cards top-scorer widgets and previous-team histories are never a current squad',()=>{
 const raw=rawSquad();delete raw.squad;raw.topScorers=[member()];raw.transfers=[member()];raw.history=[member()];
 assert.deepEqual(squadCandidates(raw,team,book,article),[]);
 raw.overview={squad:[{members:[member()]}]};assert.equal(squadCandidates(raw,team,book,article).length,1);
});
test('conflicting same ids or duplicate-name players remain ambiguous',()=>{
 const raw=rawSquad();raw.squad.squad[0].members.push(member({name:'Different Person'}));assert.deepEqual(squadCandidates(raw,team,book,article),[]);
});
test('a uniquely named surname needs a headline mentioning the exact club, not incidental prose',()=>{
 const raw=rawSquad();raw.squad.squad[0].members=[member({name:'Giorgian de Arrascaeta'})];
 assert.equal(squadCandidates(raw,team,book,{...article,title:'Crvena Zvezda discuss Arrascaeta absence',content:''})[0].aliases[0],'Arrascaeta');
 assert.deepEqual(squadCandidates(raw,team,book,{...article,title:'The coach updates fans',content:'Arrascaeta appears in unrelated material.'}),[]);
 raw.squad.squad[0].members.push(member({id:99,name:'Another Arrascaeta'}));
 assert.deepEqual(squadCandidates(raw,team,book,{...article,title:'Crvena Zvezda discuss Arrascaeta absence',content:''}),[]);
});
test('a mismatched independent person record never produces a profile',()=>{
 const c=candidate();for(const patch of [{id:999},{name:'Another Person'},{isCoach:true},{gender:'female'},{primaryTeam:{teamId:999,teamName:'FK Crvena Zvezda'}},
  {primaryTeam:{teamId:8687,teamName:'Crvena Zvezda Women'}},{birthDate:{utcTime:'1993-10-08T00:00:00Z'}},{birthDate:{utcTime:'1993-02-30'}}])
  assert.equal(verifiedPlayerFacts({...rawPlayer(),...patch},c,NOW),null);
});
test('a national-team or previous-season total is not relabelled as this league statistic',()=>{
 const raw=rawPlayer();raw.mainLeague.leagueId=1;assert.equal(verifiedPlayerFacts(raw,candidate(),NOW).competition,null);
 raw.mainLeague={leagueId:182,season:'2025/2026',leagueName:'Super Liga',stats:[{title:'Goals',value:7}]};
 const p=verifiedPlayerFacts(raw,candidate(),NOW);assert.equal(p.competition.season,'2025/2026');assert.equal(p.competition.stats[0].value,7);
});
test('invalid career numbers remain missing and unrelated participants never appear',()=>{
 const raw=rawPlayer();raw.careerHistory.careerItems.senior.teamEntries[0].appearances='undefined';
 raw.careerHistory.careerItems.senior.teamEntries.push({...raw.careerHistory.careerItems.senior.teamEntries[0],participantId:999});
 const p=verifiedPlayerFacts(raw,candidate(),NOW);assert.equal(p.career.length,1);assert.equal(p.career[0].appearances,null);
});
test('new links use a News-only page, never a made-up event or a missing Live Scores profile',async()=>{
 const reads=[];const original=[];const out=await addSquadPlayerLinks(article,[team],new Map([[team.competition,book]]),original,{clock:()=>NOW,read:async(kind,id)=>{
  reads.push([kind,id]);return kind==='team'?rawSquad():kind==='player'?rawPlayer():'https://images.fotmob.com/image_resources/playerimages/438456.png';
 }});
 assert.equal(out.players.length,1);assert.equal(out.players[0].href,'/football/players/438456?article=player-returns');
 assert.equal(out.players[0].event_id,undefined);assert.equal(out.players[0].profile.career.length,1);assert.deepEqual(original,[]);
 assert.deepEqual(reads,[['team','8687'],['player','438456'],['image','438456']]);
});
test('existing verified lineup links and their event contexts are never overwritten',async()=>{
 const p={kind:'player',id:'438456',name:'Rade Krunić',aliases:['Rade Krunić'],event_id:'actual-match',href:'/players/438456?event_id=actual-match'};
 const reads=[];const out=await addSquadPlayerLinks(article,[team],new Map([[team.competition,book]]),[p],{read:async(kind)=>{reads.push(kind);return rawSquad();}});
 assert.strictEqual(out.players[0],p);assert.equal(out.players.length,1);assert.deepEqual(reads,['team']);
});
test('an existing different id with the same player name blocks an additional guessed link',async()=>{
 const existing={kind:'player',id:'999',name:'Rade Krunić',aliases:['Rade Krunić'],href:'/players/999'};
 const out=await addSquadPlayerLinks(article,[team],new Map([[team.competition,book]]),[existing],{read:async()=>rawSquad()});
 assert.deepEqual(out.players,[existing]);
});
test('failed sources retain existing links and report partial rather than inventing identities',async()=>{
 const existing=[{id:'1',name:'Confirmed Player'}];const out=await addSquadPlayerLinks(article,[team],new Map([[team.competition,book]]),existing,{read:async()=>null});
 assert.deepEqual(out.players,existing);assert.equal(out.partial,true);
});
test('no provider requests for unverified teams or another sport',async()=>{
 let calls=0;const read=async()=>{calls++;return null;};
 await addSquadPlayerLinks(article,[{...team,primary:false}],new Map([[team.competition,book]]),[],{read});
 await addSquadPlayerLinks({...article,sport:'basketball'},[team],new Map([[team.competition,book]]),[],{read});
 assert.equal(calls,0);
});
test('source requests are anonymous and fixed to strict integer identities, coalesced and cached',async()=>{
 const calls=[];const read=createPlayerSourceReader({fetcher:async(url,opts)=>{calls.push({url,opts});return json(rawSquad());}});
 const [a,b]=await Promise.all([read('team','8687'),read('team','8687')]);assert.strictEqual(a,b);assert.equal(calls.length,1);
 await read('team','8687');assert.equal(calls.length,1);
 for(const id of ['../admin','001','1?token=abc','https://test/','-1'])assert.equal(await read('team',id),null);
 assert.equal(await read('arbitrary','8687'),null);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://www.fotmob.com/api/data/teams?id=8687');assert.equal(calls[0].opts.method,'GET');assert.equal(calls[0].opts.credentials,'omit');assert.equal(calls[0].opts.redirect,'error');
});
test('blocked malformed and oversized responses never cause loops or fake data',async()=>{
 for(const reply of [()=>json({},403),()=>json({},429),()=>new Response('html',{headers:{'Content-Type':'text/html'}}),()=>new Response('{',{headers:{'Content-Type':'application/json'}}),
  ()=>new Response('{}',{headers:{'Content-Type':'application/json','Content-Length':'6000000'}})]){
  let count=0;const read=createPlayerSourceReader({fetcher:async()=>{count++;return reply();}});assert.equal(await read('player','438456'),null);assert.equal(await read('player','438456'),null);assert.equal(count,1);
 }
});
test('image URL requires actual PNG bytes and sane dimensions, not a status-code-only placeholder',async()=>{
 for(const size of [0,1,48,128,5000]){
  const b=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.write('IHDR',12);b.writeUInt32BE(size,16);b.writeUInt32BE(size,20);
  const read=createPlayerSourceReader({fetcher:async()=>new Response(b,{headers:{'Content-Type':'image/png'}})});
  const out=await read('image','438456');assert.equal(Boolean(out),size===48||size===128);
 }
 const read=createPlayerSourceReader({fetcher:async()=>new Response('not-a-png',{headers:{'Content-Type':'image/png'}})});assert.equal(await read('image','438456'),null);
});
test('source fetch that ignores cancellation has a strict deadline',async()=>{
 let signal;const read=createPlayerSourceReader({timeoutMs:5,fetcher:async(_url,o)=>{signal=o.signal;return new Promise(()=>{});}});
 assert.equal(await read('player','438456'),null);assert(signal.aborted);
});
test('global player-source concurrency stays at two',async()=>{
 let active=0,max=0;const read=createPlayerSourceReader({fetcher:async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return json(rawSquad());}});
 await Promise.all(Array.from({length:30},(_,i)=>read('team',String(i+1))));assert(max<=2);
});

test('full News context connects a verified player absent from every recent match lineup',async()=>{
 const {contextLoader}=require('../server/newsArticleContext.cjs');
 const fixture={id:'actual-match',sport:'football',competition_key:team.competition,football_gender:'men',start_time:'2026-10-01T16:00:00Z',home:{id:'8687',name:'Crvena zvezda'},away:{id:'7998',name:'Partizan'}};
 const read=async path=>path.startsWith('/articles/')?article:path.includes('/events?')?{sport:'football',events:[fixture],snapshot:{complete:true}}:
  path.endsWith('/hub')?{competition:{id:team.competition},events:[fixture]}:{id:fixture.id,event:fixture,lineups:{}};
 const b={...book,key:team.competition,teams:new Map([['8687',{id:'8687',name:'Crvena zvezda'}],['7998',{id:'7998',name:'Partizan'}]]),byName:new Map([['crvena zvezda',new Set(['8687'])],['partizan',new Set(['7998'])]])};
 const story={...article,published_at:'2026-10-03T12:00:00Z'};
 const load=contextLoader({read:async p=>p.startsWith('/articles/')?story:read(p),nativeRead:async()=>b,clock:()=>NOW,
  playerRead:async(kind)=>kind==='team'?rawSquad():kind==='player'?rawPlayer():null});
 const result=await load(article.slug);assert.equal(result.players.length,1);assert.equal(result.players[0].id,'438456');assert(result.players[0].profile);
 assert.equal(result.matches[0].id,'actual-match');assert.equal(result.players[0].event_id,undefined);
});
