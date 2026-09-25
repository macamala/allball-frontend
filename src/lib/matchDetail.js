// Pure presentation helpers. Never derive a score, status or invented formation.
export function matchPayloadMatches(payload, requestedId) {
  const event = payload?.event || payload?.header;
  if (!event?.id || !requestedId) return false;
  if (payload?.event?.id && payload?.header?.id && payload.event.id !== payload.header.id) return false;
  // The API's explicit request envelope proves an old link's canonical response.
  return payload.id ? payload.id === requestedId : event.id === requestedId;
}

export function uniqueStatistics(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter(row => {
    if (!row || ![row.home, row.away, row.value].some(v => v != null && v !== '')) return false;
    const key = String(row.label || row.name || '').trim().toLowerCase();
    if (!key || seen.has(key) || (row.unknown && row.home === 0 && row.away === 0)) return false;
    seen.add(key); return true;
  });
}

export function incidentMinute(row) {
  if (row?.minute == null || row.minute === '') return '';
  const text = String(row.minute).trim().replace(/[’']/g, '');
  const added = Number(row.stoppage);
  return `${text}${!text.includes('+') && Number.isFinite(added) && added > 0 ? `+${added}` : ''}’`;
}

export function incidentPeriod(row) {
  const period = String(row?.period || '').toLowerCase().replace(/[_\s-]/g, '');
  if (['penalties', 'penaltyshootout', 'shootout', '5'].includes(period)) return 'penalties';
  if (['4', 'extrasecondhalf', 'secondextra', 'et2'].includes(period)) return 'extra_second';
  if (['3', 'extrafirsthalf', 'firstextra', 'et1'].includes(period)) return 'extra_first';
  if (['1', 'firsthalf', '1st'].includes(period)) return 'first';
  if (['2', 'secondhalf', '2nd'].includes(period)) return 'second';
  const minute = parseInt(row?.minute, 10);
  if (!Number.isFinite(minute)) return 'other';
  return minute <= 45 ? 'first' : 'second';
}

export function footballIncidentKind(row) {
  // The specific card type wins over the generic family='card'.
  const type = String(row?.type || row?.family || '').toLowerCase();
  if (/second.?yellow|yellow.?red|red/.test(type)) return 'red-card';
  if (/yellow|card/.test(type)) return 'yellow-card';
  if (/sub/.test(type)) return 'substitution';
  if (/var|cancel|disallow/.test(type)) return 'var';
  if (/goal/.test(type)) return 'goal';
  return 'event';
}

export function formationBands(side) {
  const starters = (side?.start || []).filter(p => p?.name);
  if (!starters.length) return [];
  const positioned = starters.every(p => typeof p.pitch_position?.x === 'number' && typeof p.pitch_position?.y === 'number' && p.pitch_position.x >= 0 && p.pitch_position.x <= 1 && p.pitch_position.y >= 0 && p.pitch_position.y <= 1);
  if (positioned) {
    const bands = new Map();
    starters.forEach(player => {
      const y = Math.round(player.pitch_position.y * 1000);
      if (!bands.has(y)) bands.set(y, []);
      bands.get(y).push(player);
    });
    return [...bands].sort((a,b) => a[0]-b[0]).map(([,row]) => row.sort((a,b) => a.pitch_position.x-b.pitch_position.x));
  }
  const formation = String(side?.formation || '').trim();
  if (!/^\d+(?:-\d+){1,5}$/.test(formation)) return [];
  const counts = formation.split('-').map(Number);
  if (counts.some(v => v <= 0 || v > 6) || counts.reduce((a,b) => a+b, 0) !== starters.length - 1) return [];
  let cursor = 0;
  return [1, ...counts].map(count => { const row=starters.slice(cursor,cursor+count);cursor+=count;return row; });
}
