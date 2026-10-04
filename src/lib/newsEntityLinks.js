/** Preserve the original article text, link only identities verified for this article. */
const SHORT_CLUB_NAMES = new Set(['PSG','PSV','SJK','HJK','QPR','AIK']);
export function safeEntityPath(value) {
  return typeof value === 'string' && /^\/(?:teams\/|players\/|scores\/event\/)[A-Za-z0-9_.:%-]+(?:\?[^#\r\n]*)?$/.test(value)
    && !value.includes('\\');
}
function foldCharacter(character) {
  return character.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[øđßæł]/g, c => ({ ø: 'o', đ: 'dj', ß: 'ss', æ: 'ae', ł: 'l' }[c]))
    .replace(/[^\p{L}\p{N}]/gu, ' ');
}
export function foldedText(text) {
  let folded = '', position = 0;
  const starts = [], ends = [];
  for (const character of String(text || '')) {
    const value = foldCharacter(character);
    for (const part of value) {
      if (part === ' ' && folded.endsWith(' ')) { ends[ends.length - 1] = position + character.length; continue; }
      folded += part; for (let i = 0; i < part.length; i++) { starts.push(position); ends.push(position + character.length); }
    }
    position += character.length;
  }
  return { folded, starts, ends };
}
export function entityTextParts(text, entities = []) {
  const raw = String(text || '');
  if (!raw || !Array.isArray(entities) || !entities.length) return [{ text: raw }];
  const { folded, starts, ends } = foldedText(raw), aliases = new Map();
  for (const entity of entities.slice(0,40)) {
    if (!['team','player'].includes(entity?.kind) || !safeEntityPath(entity.href)) continue;
    for (const alias of (Array.isArray(entity.aliases) ? entity.aliases : [entity.name]).slice(0,8)) {
      if (typeof alias !== 'string') continue;
      const term = foldedText(alias).folded.trim();
      if (term.length < 4 && !(entity.kind === 'team' && SHORT_CLUB_NAMES.has(alias))) continue;
      const existing = aliases.get(term);
      if (existing === null || (existing && (existing.id !== entity.id || existing.kind !== entity.kind))) aliases.set(term, null);
      else aliases.set(term, entity);
    }
  }
  const hits = [];
  for (const [term, entity] of aliases) {
    if (!entity) continue;
    let at = folded.indexOf(term);
    while (at !== -1) {
      const end = at + term.length;
      if ((at === 0 || folded[at-1] === ' ') && (end === folded.length || folded[end] === ' ')
          && (term.length >= 4 || raw.slice(starts[at], ends[end-1]) === term.toUpperCase()))
        hits.push({ start: starts[at], end: ends[end-1], entity });
      at = folded.indexOf(term, at + term.length);
    }
  }
  hits.sort((a,b) => a.start - b.start || b.end - a.end);
  const output = []; let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor || hit.end <= hit.start) continue;
    if (hit.start > cursor) output.push({ text: raw.slice(cursor, hit.start) });
    output.push({ text: raw.slice(hit.start, hit.end), entity: hit.entity }); cursor = hit.end;
  }
  if (cursor < raw.length) output.push({ text: raw.slice(cursor) });
  return output.length ? output : [{ text: raw }];
}
