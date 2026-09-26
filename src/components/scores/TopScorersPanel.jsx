import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useScopedResource from '../../hooks/useScopedResource.js';
import { playerProfilePath, teamProfilePath } from '../../lib/sportsData.js';
import { normalizeAssetUrl } from '../../lib/assetUrls.js';

export default function TopScorersPanel({ competitionKey, season = '', group = '', sr = false }) {
  const query = new URLSearchParams();
  if (season) query.set('season', season);
  if (group) query.set('group', group);
  const path = `/sports-data/competitions/${encodeURIComponent(competitionKey)}/scorers${query.size ? `?${query}` : ''}`;
  const resource = useScopedResource(path, 300000);
  const [team, setTeam] = useState('');
  const [limit, setLimit] = useState(25);
  const rows = resource.data?.rows || [];
  const teams = useMemo(() => [...new Map(rows.map(r => [r.team_id, r.team])).entries()].sort((a,b) => a[1].localeCompare(b[1])), [rows]);
  const shown = rows.filter(r => !team || r.team_id === team);
  return <section className="hub-match-card top-scorers-panel">
    <div className="hub-section-heading"><h2>{sr ? 'Najbolji strelci' : 'Top scorers'}</h2>{resource.data?.season ? <span className="hub-count">{resource.data.season}</span> : null}</div>
    {resource.loading ? <p role="status">{sr ? 'Učitavanje strelaca…' : 'Loading scorers…'}</p> : resource.error ? <p role="alert">{sr ? 'Podaci trenutno nisu dostupni.' : 'Scorer data could not be loaded.'} <button onClick={resource.refresh}>{sr ? 'Pokušaj ponovo' : 'Try again'}</button></p> : !rows.length ? <p className="hub-empty-message">{sr ? 'Za izabranu ligu, grupu i sezonu još nema potvrđene liste strelaca.' : 'A verified scorer list is not yet available for this competition, group and season.'}</p> : <>
      <label className="hub-control scorer-team-filter">{sr ? 'Ekipa' : 'Team'}<select aria-label="Scorer team" value={team} onChange={e => {setTeam(e.target.value); setLimit(25);}}><option value="">{sr ? 'Sve ekipe' : 'All teams'}</option>{teams.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <ol className="scorer-list" aria-label={sr ? 'Lista strelaca' : 'Goals leaderboard'}>{shown.slice(0,limit).map(row => <li key={row.player_id} className="scorer-row">
        <span className="scorer-rank">{row.rank}</span><img className="scorer-photo" src={normalizeAssetUrl(row.photo)} alt="" loading="lazy" />
        <div className="scorer-identity"><Link to={playerProfilePath({id:row.player_id,name:row.name},{profile_scope:{competition_key:competitionKey,season:resource.data?.season || season,group}})}>{row.name}</Link><Link className="scorer-team" to={teamProfilePath({id:row.team_id,name:row.team},{sport:'football',competition_key:competitionKey})}><img src={normalizeAssetUrl(row.team_logo)} alt="" loading="lazy" />{row.team}</Link>{row.appearances != null ? <small>{row.appearances} {sr ? 'nastupa' : 'appearances'}{row.penalties != null ? ` · ${row.penalties} ${sr ? 'iz penala' : 'penalties'}` : ''}</small> : null}</div>
        <div className="scorer-goals"><strong>{row.goals}</strong><small>{sr ? 'golova' : 'goals'}</small></div>
      </li>)}</ol>
      {shown.length > limit ? <button className="hub-load-more" onClick={() => setLimit(n=>n+25)}>{sr ? 'Prikaži još' : 'Show more scorers'}</button> : null}
      <p className="hub-coverage-note">{sr ? 'Samo potvrđeni golovi u izabranoj sezoni. Podaci se ponovo proveravaju dok je stranica otvorena.' : 'Confirmed goals for the selected season. This view refreshes while the page is open.'}</p>
    </>}
  </section>;
}
