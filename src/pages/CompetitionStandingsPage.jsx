import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getStandings } from "../api.js";
import CompetitionHubPanels from "../components/scores/CompetitionHubPanels.jsx";
import StandingsTable from "../components/StandingsTable.jsx";
import CountryFlag from "../components/scores/CountryFlag.jsx";
import { normalizeAssetUrl } from "../lib/assetUrls.js";
import useVisiblePoll from "../hooks/useVisiblePoll.js";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";
import "../styles/competitionStandings.css";

export default function CompetitionStandingsPage() {
  const { competitionKey } = useParams();
  const [params, setParams] = useSearchParams();
  const sport = params.get("sport") || "football";
  const group = params.get("group") || "";
  const season = params.get("season") || "";
  const requestKey = `${competitionKey}\u0000${season}`;
  const { lang } = useI18n();
  const sr = lang === "sr";
  const [state, setState] = useState({ key: "", payload: null, loading: true, error: "" });
  const visit = useRef(0);
  const pending = useRef(null);
  const refresh = useCallback(async () => {
    const generation = visit.current;
    if (pending.current === generation) return;
    pending.current = generation;
    try {
      const payload = await getStandings(competitionKey, { season });
      if (visit.current === generation) setState({ key: requestKey, payload, loading: false, error: "" });
    } catch {
      if (visit.current === generation) setState(previous => ({
        key: requestKey, payload: previous.key === requestKey ? previous.payload : null,
        loading: false, error: sr ? "Tabela trenutno ne može da se osveži." : "The table could not be refreshed.",
      }));
    } finally {
      if (pending.current === generation) pending.current = null;
    }
  }, [competitionKey, requestKey, season, sr]);
  useEffect(() => {
    visit.current += 1;
    pending.current = null;
    setState({ key: requestKey, payload: null, loading: true, error: "" });
    refresh();
    return () => { visit.current += 1; pending.current = null; };
  }, [requestKey, refresh]);
  useVisiblePoll(refresh, season ? 300000 : 30000);
  const payload = state.key === requestKey ? state.payload : null;
  const meta = payload?.competition && typeof payload.competition === "object" ? payload.competition : {};
  const title = meta.name || competitionKey.replace(/^football-/, "").replace(/-/g, " ");
  const rows = payload?.rows || [];
  const seasons = payload?.seasons || [];
  const logo = normalizeAssetUrl(meta.logo);
  useEffect(() => setPageSeo({ title: `${title} standings | NinkoSports`, description: `${title} league and group standings.`, path: `/scores/competition/${encodeURIComponent(competitionKey)}/standings` }), [competitionKey, title]);
  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const updated = payload?.updated_at ? new Date(payload.updated_at) : null;
  return (
    <div className="competition-standings-page">
      <Link className="standings-back" to={`/live-scores?sport=${encodeURIComponent(sport)}`}>‹ Live Scores</Link>
      <header className="competition-standings-hero">
        <div className="competition-standings-identity">
          {logo ? <img src={logo} alt="" width="48" height="48" /> : null}
          <div>
            <p className="standings-eyebrow">{meta.country_id ? <CountryFlag countryId={meta.country_id} /> : null}{sr ? "Pregled takmičenja" : "Competition centre"}</p>
            <h1>{title}</h1>
          </div>
        </div>
        <div className="standings-season">
          {seasons.length > 1 ? <label>{sr ? "Sezona" : "Season"}<select aria-label="Standings season" value={season || payload?.season || ""} onChange={e => updateParam("season", e.target.value)}>{seasons.map(s => <option key={s} value={s}>{s}</option>)}</select></label> : payload?.season ? <span>{sr ? "Sezona" : "Season"} {payload.season}</span> : null}
        </div>
      </header>
      <CompetitionHubPanels competitionKey={competitionKey} sport={meta.sport || sport} group={group} season={season} meta={meta}>
      <section className="competition-table-card" aria-label={sr ? "Tabela lige ili grupe" : "League or group table"} aria-busy={state.loading}>
        {state.error ? <p className="standings-message" role="alert">{state.error} <button type="button" onClick={refresh}>{sr ? "Pokušaj ponovo" : "Try again"}</button></p> : null}
        {state.loading ? <p className="standings-message" role="status">{sr ? "Učitavanje tabele…" : "Loading standings…"}</p> : rows.length ? (
          <StandingsTable key={`${requestKey}:${group}`} rows={rows} sport={meta.sport || sport} competition={competitionKey} competitionCountry={meta.country_id} event={{ group }} strictGroup onGroupChange={g => updateParam("group", g)} />
        ) : !state.error ? <div className="standings-empty"><h2>{sr ? "Tabela još nije dostupna" : "Standings not available yet"}</h2><p>{sr ? "Za ovu ligu, grupu ili sezonu još nemamo potvrđenu tabelu. Prijateljske i neke kup-utakmice nemaju ligašku tabelu." : "A confirmed table for this competition or season is not available yet. Friendlies and some knockout competitions do not have league standings."}</p><button type="button" onClick={refresh}>{sr ? "Proveri ponovo" : "Check again"}</button></div> : null}
        {updated && Number.isFinite(updated.getTime()) ? <p className="standings-updated">{payload.stale ? (sr ? "Poslednja sačuvana tabela" : "Last saved table") : (sr ? "Poslednja provera" : "Last checked")}: <time dateTime={payload.updated_at}>{updated.toLocaleString(sr ? "sr-Latn" : "en-GB")}</time></p> : null}
      </section>
      </CompetitionHubPanels>
    </div>
  );
}
