import React, { useState } from 'react';
import { incidentMinute, incidentPeriod, footballIncidentKind } from '../../lib/matchDetail.js';

export default function FootballTimeline({ items, t, onPlayerSelect }) {
  const [filter, setFilter] = useState('all');
  const visible = items.filter(row => filter === 'all' || footballIncidentKind(row) === 'goal' || footballIncidentKind(row) === 'red-card' || footballIncidentKind(row) === 'var');
  const groups = [['first',t('match.firstHalf')],['second',t('match.secondHalf')],['extra_first','Extra time · 1st half'],['extra_second','Extra time · 2nd half'],['penalties','Penalty shootout'],['other','Other events']];
  const player = (name,id) => name ? <button type="button" className="mc-event-person" onClick={() => onPlayerSelect?.({name, id})} aria-label={`Open ${name} details`}>{name}</button> : null;
  return <section className="mc-card mc-timeline-card mc-match-story">
    <div className="mc-card-title-row"><h2>{t('match.timeline')}</h2><div className="mc-control-group" aria-label="Timeline filter">
      <button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All events</button>
      <button type="button" aria-pressed={filter==='key'} onClick={()=>setFilter('key')}>Key events</button>
    </div></div>
    {!visible.length ? <p className="mc-muted">No key events supplied.</p> : null}
    {groups.map(([key,label])=>{
      const rows=visible.filter(row=>incidentPeriod(row)===key);
      if(!rows.length)return null;
      return <div className="mc-timeline-block" key={key}><h3 className="mc-timeline-label">{label}</h3><ol className="mc-timeline">
        {rows.map((row,index)=>{
          const kind=footballIncidentKind(row),side=['home','away'].includes(row.side)?row.side:'neutral';
          const content=<span className="mc-timeline-event">
            <span className={`mc-event-icon is-${kind}`} aria-hidden="true">{kind==='goal'?'●':kind==='substitution'?'↕':kind==='var'?'VAR':''}</span>
            <span className="mc-timeline-copy">
              {kind==='substitution'?<><span className="mc-sub-in">↑ {player(row.player_in,row.player_in_id) || 'Substitution'}</span>{row.player_out?<span className="mc-sub-out">↓ {player(row.player_out,row.player_out_id)}</span>:null}</>:<>{player(row.player,row.player_id) || row.description || String(row.type||'Event').replace(/_/g,' ')}{row.assist?<small>Assist · {player(row.assist,row.assist_id)}</small>:null}{row.type==='own_goal'?<small>Own goal</small>:row.type==='penalty_goal'?<small>Penalty</small>:null}</>}
            </span>
            {kind==='goal' && row.score_after?.home!=null && row.score_after?.away!=null?<strong className="mc-tl-score">{row.score_after.home}–{row.score_after.away}</strong>:null}
          </span>;
          return <li className={`mc-timeline-item is-${side}`} key={row.id||`${row.minute}-${index}`}><span className="mc-timeline-side is-home">{side!=='away'?content:null}</span><time className="mc-minute">{incidentMinute(row)}</time><span className="mc-timeline-side is-away">{side==='away'?content:null}</span></li>;
        })}
      </ol></div>;
    })}
  </section>;
}
