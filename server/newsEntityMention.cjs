'use strict';
/** Negative lexical guards for News links. A matching word is not, by itself,
 * a football club or national-team mention. No content is rewritten here. */
const SHORT=new Set(['PSG','PSV','SJK','HJK','QPR','AIK']);
const norm=text=>String(text||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/[øđßæł]/g,c=>({'ø':'o','đ':'dj','ß':'ss','æ':'ae','ł':'l'}[c])).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const esc=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const regions=new Intl.DisplayNames(['en'],{type:'region'}),NATIONS=new Set(['england','scotland','wales','northern ireland','turkiye','turkey','south korea','korea republic','usa','united states']);
for(let a=65;a<91;a++)for(let b=65;b<91;b++){const code=String.fromCharCode(a,b);const name=regions.of(code);if(name&&name!==code)NATIONS.add(norm(name));}
function teamMentioned(raw,alias){
 const needle=norm(alias),text=norm(raw);
 if(needle.length<3||!needle)return false;
 if(needle.length===3&&(!SHORT.has(alias)||!new RegExp('(?:^|[^\\p{L}\\p{N}])'+esc(alias)+'(?:[^\\p{L}\\p{N}]|$)','u').test(String(raw))))return false;
 if(needle==='ready'&&!/\b(?:if ready|ready fk|ready s (?:coach|manager|players|goalkeeper|squad))\b/.test(text))return false;
 if(needle==='rade'&&!/(?:^|[^\p{L}])Råde(?:[^\p{L}]|$)/u.test(String(raw))&&!/\b(?:rade fk|fk rade|rade football club)\b/.test(text))return false;
 for(const hit of text.matchAll(new RegExp('(?:^| )('+esc(needle)+')(?= |$)','gu'))){
  const start=hit.index+(hit[0].startsWith(' ')?1:0),before=text.slice(Math.max(0,start-70),start),after=text.slice(start+needle.length,start+needle.length+70);
  if(NATIONS.has(needle)&&/\b(?:in|from|to|through|across|around|within)\s*$/.test(before))continue;
  if(needle==='nice'&&!/\b(?:joins?|joined|signs? for|signed for|leaves?|left|leaving|against)\s*$/.test(before)&&
    !/^\s+(?:s\s+(?:coach|manager|director|players|squad)|signs?|signed|appoints?|appointed|confirms?|confirmed|beats?|defeats?|hosts?|faces?|wins?|lost|lose|draws?)\b/.test(after))continue;
  return true;
 }
 return false;
}
module.exports={teamMentioned,SHORT};
