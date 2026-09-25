/** Display-time interpolation only; never manufactures live status or scores. */
import { isConfirmedLive } from "./sportsData.js";
export function matchClock(event, now = Date.now()) {
  const raw = event?.score?.minute;
  const stamp = Date.parse(event?.score_observed_at || "");
  const age = Number.isFinite(stamp) ? Math.max(0, (now-stamp)/1000) : null;
  const running = isConfirmedLive(event) && String(event.status).toLowerCase() === "live";
  const text = String(raw ?? "").trim().replace(/[’']/g, "");
  const parsed = /^(\d{1,3})(?:\+(\d{1,2}))?$/.exec(text);
  if (!running || !parsed || age === null || age > 90 || now < stamp-1000) {
    return {label:null, estimated:false, delayed:running && (age === null || age > 90), age};
  }
  const minute=Number(parsed[1]), added=Number(parsed[2] || 0);
  if (minute > 120 || added > 30) return {label:null, estimated:false, delayed:false, age};
  // A whole-minute observation is not a referee's seconds clock. Be explicit.
  const boundary = minute < 45 ? 45 : minute < 90 ? 90 : minute < 105 ? 105 : 120;
  const seconds = Math.floor(age);
  const elapsed = parsed[2] ? added*60+seconds : Math.min(minute*60+seconds, boundary*60);
  const label = parsed[2] ? `${minute}+${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}` : `${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;
  return {label:`≈${label}`, estimated:true, delayed:false, age};
}

export function newerMatchEvent(previous, incoming) {
  const oldAt=Date.parse(previous?.score_observed_at || previous?.updated_at || "");
  const nextAt=Date.parse(incoming?.score_observed_at || incoming?.updated_at || "");
  if (Number.isFinite(oldAt) && Number.isFinite(nextAt) && nextAt < oldAt) {
    return {...incoming,...previous};
  }
  return incoming;
}
