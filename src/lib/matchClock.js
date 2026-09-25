/** Display-time interpolation only; never manufactures live status or scores. */
import { isConfirmedLive } from "./sportsData.js";
export function matchClock(event, now = Date.now()) {
  const raw = event?.score?.minute;
  const stamp = Date.parse(event?.score_observed_at || "");
  const age = Number.isFinite(stamp) ? Math.max(0, (now-stamp)/1000) : null;
  const running = isConfirmedLive(event) && String(event.status).toLowerCase() === "live";
  const text = String(raw ?? "").replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim().replace(/[’']/g, "");
  const parsed = /^(\d{1,3})(?:\+(\d{1,2}))?$/.exec(text);
  const precise = /^(\d{1,3}):(\d{2})$/.exec(String(event?.score?.clock || "").trim());
  const preciseValid = precise && Number(precise[1]) <= 150 && Number(precise[2]) < 60;
  if (!running || (!parsed && !preciseValid) || age === null || age > 90 || now < stamp-1000) {
    return {label:null, estimated:false, delayed:running && (age === null || age > 90), age};
  }
  if (preciseValid) {
    const sourceMinute = Number(precise[1]);
    const sourceSeconds = sourceMinute*60 + Number(precise[2]);
    const addedBase = parsed?.[2] ? Number(parsed[1]) : null;
    const boundary = sourceMinute < 45 ? 45 : sourceMinute < 90 ? 90 : sourceMinute < 105 ? 105 : 150;
    const advancing = addedBase == null ? Math.min(sourceSeconds + Math.floor(age), boundary*60) : sourceSeconds + Math.floor(age);
    const shown = addedBase == null ? advancing : Math.max(0, advancing-addedBase*60);
    const label = `${addedBase == null ? "" : `${addedBase}+`}${Math.floor(shown/60)}:${String(shown%60).padStart(2,"0")}`;
    return {label:`≈${label}`, estimated:true, delayed:false, age};
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
