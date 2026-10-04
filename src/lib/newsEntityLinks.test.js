import {describe,it,expect} from 'vitest';
import {entityTextParts,safeEntityPath} from './newsEntityLinks.js';
const player={kind:'player',id:'422685',name:'Bruno Fernandes',aliases:['Bruno Fernandes','Fernandes'],href:'/players/422685?name=Bruno+Fernandes&event_id=ninko-evt-a'};
const team={kind:'team',id:'8361',name:'Portugal',aliases:['Portugal'],href:'/teams/8361?sport=football&competition=uefa-nations-league&name=Portugal'};
it('links whole verified names while preserving every character of the original prose',()=>{
 const text='Bruno Fernandes — Portugal. “Fernandes”, said the reporter. PortugalExtra is not Portugal.';
 const parts=entityTextParts(text,[player,team]);
 expect(parts.map(p=>p.text).join('')).toBe(text);
 expect(parts.filter(p=>p.entity).map(p=>p.text)).toEqual(['Bruno Fernandes','Portugal','Fernandes','Portugal']);
});
it('longer names win without nested or overlapping links',()=>{
 const parts=entityTextParts('Bruno Fernandes',[player]);
 expect(parts).toHaveLength(1);expect(parts[0].text).toBe('Bruno Fernandes');
});
it.each(['javascript:alert(1)','//evil.test','https://evil.test/teams/1','/teams/1\\evil','/admin/delete?x=1','/teams/1#bad','/scores/event/../../admin'])('rejects non-profile or unsafe destinations %s',href=>{
 expect(safeEntityPath(href)).toBe(false);expect(entityTextParts('Bruno Fernandes',[{...player,href}]).some(p=>p.entity)).toBe(false);
});
it('does not guess between namesakes with different verified identifiers',()=>{
 const parts=entityTextParts('Bruno Fernandes',[player,{...player,id:'different',href:'/players/different'}]);
 expect(parts).toEqual([{text:'Bruno Fernandes'}]);
});
it('handles diacritics without modifying text or surrounding punctuation',()=>{
 const p={...player,name:'Joakim Mæhle',aliases:['Joakim Maehle']};
 const text='⚽ Joakim Mæhle played. <b>Not markup</b>';
 const parts=entityTextParts(text,[p]);expect(parts.map(p=>p.text).join('')).toBe(text);expect(parts.find(p=>p.entity).text).toBe('Joakim Mæhle');
});
it('empty and malformed registries leave text intact',()=>{
 expect(entityTextParts('Original words',null)).toEqual([{text:'Original words'}]);expect(entityTextParts('Portugal',[{}])).toEqual([{text:'Portugal'}]);
});
