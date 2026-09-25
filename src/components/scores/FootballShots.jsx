import React, { useState } from 'react';
import { incidentMinute } from '../../lib/matchDetail.js';
import { participantName } from '../../lib/sportsData.js';
const outcome = type => String(type||'Shot').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ');
export default function FootballShots({ shots, event, onPlayerSelect }) {
  const [side,setSide]=useState('all');
  const [goals,setGoals]=useState(false);
  const rows=shots.filter(row=>(side==='all'||row.side===side)&&(!goals||row.type==='Goal'));
  return <section className="mc-card mc-shots-card">
    <div className="mc-card-title-row"><h2>Shots <small>{rows.length} / {shots.length}</small></h2><button className="mc-toggle" type="button" aria-pressed={goals} onClick={()=>setGoals(!goals)}>Goals only</button></div>
    <div className="mc-control-group mc-shot-teams" aria-label="Shot team filter">{['all','home','away'].map(key=><button type="button" key={key} aria-pressed={side===key} onClick={()=>setSide(key)}>{key==='all'?'Both teams':participantName(event[key])}</button>)}</div>
    <div className="mc-shot-heading" aria-hidden="true"><span>Time</span><span>Player / outcome</span><span>xG</span></div>
    <ol className="mc-shot-list">{rows.map((row,index)=><li key={row.id||index} className={`is-${row.side||'neutral'} ${row.type==='Goal'?'is-goal':''}`}>
      <time>{incidentMinute(row)}</time><div><button type="button" className="mc-event-person" aria-label={`Open ${row.player} details`} onClick={()=>onPlayerSelect?.({id:row.player_id,name:row.player})}>{row.player}</button><small>{outcome(row.type)}{row.side?` · ${participantName(event[row.side])}`:''}</small></div><span>{typeof row.xg==='number' && Number.isFinite(row.xg)?row.xg.toFixed(2):'—'}</span>
    </li>)}</ol>{!rows.length?<p className="mc-muted">No shots match these filters.</p>:null}
    <p className="mc-muted mc-footnote">xG is the supplied chance estimate for each shot, not a goal prediction.</p>
  </section>;
}
