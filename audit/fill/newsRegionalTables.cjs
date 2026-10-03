'use strict';
const {parse}=require('parse5');
const SPECS=Object.freeze({
 'czech-second-league':{origin:'https://www.chnliga.cz',path:'/tabulka',name:'Chance Národní Liga',country:'cz',source:'official-chnliga'},
 'austria-second-league':{origin:'https://www.2liga.at',path:'/de/tabelle',name:'ADMIRAL 2. Liga',country:'at',source:'official-2liga'},
});
const must=x=>{if(!x)throw Error('Official table identity or structure changed');};
const attr=(n,k)=>(n?.attrs||[]).find(a=>a.name===k)?.value||'';
const has=(n,k)=>(n.attrs||[]).some(a=>a.name===k);
function nodes(n,p){const out=[];function visit(v){if(p(v))out.push(v);for(const c of v.childNodes||[])visit(c);}visit(n);return out;}
function text(n){if(['script','style'].includes(n?.tagName))return '';return n?.nodeName==='#text'?n.value:(n?.childNodes||[]).map(text).join(' ').replace(/\s+/g,' ').trim();}
const integer=n=>{const s=text(n);must(/^-?\d+$/.test(s));return Number(s);};
function parseRegionalTable(html,key,now=Date.now()){
 const spec=SPECS[key];must(spec&&typeof html==='string'&&html.length<3000000);const doc=parse(html);
 let year,table;
 if(key==='czech-second-league'){
  must(nodes(doc,n=>n.tagName==='meta'&&attr(n,'property')==='og:site_name').some(n=>attr(n,'content')==='Chance Národní Liga'));
  must(nodes(doc,n=>n.tagName==='meta'&&attr(n,'property')==='og:url').some(n=>attr(n,'content')===spec.origin+spec.path));
  const select=nodes(doc,n=>n.tagName==='select'&&attr(n,'name')==='id_season');must(select.length===1);
  const selected=nodes(select[0],n=>n.tagName==='option'&&has(n,'selected'));must(selected.length===1);const m=/^(20\d{2})\/(20\d{2})$/.exec(text(selected[0]));must(m&&Number(m[2])===Number(m[1])+1&&attr(selected[0],'value')==='/tabulka/'+m[1]);year=Number(m[1]);
  const tables=nodes(doc,n=>n.tagName==='table'&&attr(n,'class').split(/\s+/).includes('standings__table'));must(tables.length===1);table=tables[0];
 }else{
  must(nodes(doc,n=>n.tagName==='link'&&attr(n,'rel')==='canonical').some(n=>attr(n,'href')===spec.origin+spec.path));
  must(nodes(doc,n=>n.tagName==='h1').some(n=>text(n)==='ADMIRAL 2. Liga Tabelle'));
  const selected=nodes(doc,n=>n.tagName==='button'&&attr(n,'aria-haspopup')==='menu').map(text).filter(t=>/^20\d{2} \/ 20\d{2}$/.test(t));must(selected.length===1);const years=selected[0].split(' / ').map(Number);must(years[1]===years[0]+1);year=years[0];
  const tabs=nodes(doc,n=>n.tagName==='button'&&['Gesamt','Heim','Auswärts'].includes(text(n))).map(text);must(JSON.stringify(tabs)===JSON.stringify(['Gesamt','Heim','Auswärts']));
  const tables=nodes(doc,n=>n.tagName==='table');must(tables.length===3);table=tables[0];
 }
 must(now>=Date.UTC(year,6,1)&&now<Date.UTC(year+1,7,1));const season=year+'/'+(year+1),headers=nodes(table,n=>n.tagName==='th').map(text);
 const expected=key==='czech-second-league'?['#','','Klub','Z','V','R','P','G+','G-','RG','B','']:['PL','Tendenz','','Klub','Spiele','S','U','N','Tore','GT','TD','Punkte','','',''];must(JSON.stringify(headers)===JSON.stringify(expected));
 const rows=[],ids=new Set(),ranks=new Set();
 for(const tr of nodes(table,n=>n.tagName==='tr')){
  const cols=(tr.childNodes||[]).filter(c=>c.tagName==='td');if(!cols.length||key==='czech-second-league'&&cols.length===1&&attr(cols[0],'colspan'))continue;
  must(cols.length===expected.length);const rank=integer(cols[0]);must(rank>=1&&rank<=16&&!ranks.has(rank));ranks.add(rank);
  const cell=cols[2],imgs=nodes(cell,n=>n.tagName==='img'),links=nodes(cell,n=>n.tagName==='a');must(imgs.length===1&&links.length===1);
  const href=attr(links[0],'href'),m=(key==='czech-second-league'?new RegExp('^/tymy/'+year+'/(\\d+)-[^/]+$'):/^\/team\/[^/]+\/(\d+)$/).exec(href);must(m);const id=m[1];must(!ids.has(id));ids.add(id);
  const team=key==='czech-second-league'?text(links[0]):attr(imgs[0],'alt');must(team&&attr(imgs[0],'alt')===team);
  const image=new URL(attr(imgs[0],'src'),spec.origin);must(image.origin===spec.origin);
  if(key==='czech-second-league')must(image.pathname==='/photo/team/team_'+id+'.png');
  else {must(image.pathname==='/_next/image');const origin=new URL(image.searchParams.get('url'));must(origin.protocol==='https:'&&origin.hostname==='bundesliga-craftcms-production-bucket.s3.eu-central-1.amazonaws.com'&&origin.pathname.endsWith('/Klubs/Icons/'+id+'.png'));must(text(cols[3]).endsWith(team));}
  const offset=key==='czech-second-league'?3:4;const values=cols.slice(offset,offset+8).map(integer),[played,wins,draws,losses,gf,ga,gd,points]=values;
  must(played>=0&&wins>=0&&draws>=0&&losses>=0&&gf>=0&&ga>=0&&played===wins+draws+losses&&gd===gf-ga);
  rows.push({rank,team,team_id:spec.source+':'+id,logo:image.href,played,wins,draws,losses,goals_for:gf,goals_against:ga,goal_difference:gd,points,season,group:null,stage:'Regular season',country_id:spec.country});
 }
 must(rows.length===16);return {competition:{id:key,sport:'football',name:spec.name,country_id:spec.country},sport:'football',season,seasons:[season],rows,available:true,source:spec.source,source_url:spec.origin+spec.path,stale:false,updated_at:new Date(now).toISOString(),_newsRead:{readAt:new Date(now).toISOString(),sourceUpdatedAt:null,supplementary:true,scope:'official_published_standings',completeSeasonCoverageVerified:false}};
}
module.exports={SPECS,parseRegionalTable};
