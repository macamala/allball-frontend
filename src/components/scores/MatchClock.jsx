import React, {useEffect, useState} from "react";
import {matchClock} from "../../lib/matchClock.js";
import {statusLabel} from "../../lib/scorePresentation.js";
import {isConfirmedLive} from "../../lib/sportsData.js";
export default function MatchClock({event,t,time}) {
  const [now,setNow]=useState(Date.now());
  const live=isConfirmedLive(event);
  useEffect(()=>{
    if(!live)return undefined;
    const timer=setInterval(()=>{if(!document.hidden)setNow(Date.now());},1000);
    return ()=>clearInterval(timer);
  },[live]);
  const clock=event.sport==='football'?matchClock(event,now):{};
  return <div className="mc-clock-block">
    <div className={`mc-score-status ${live?'is-live':''}`} role={live?'timer':undefined} aria-live="off" title={clock.estimated?'Estimated clock between confirmed source updates':undefined}>
      {clock.label || statusLabel(event,t,time)}
    </div>
    {clock.estimated?<small className="mc-clock-note">Estimated match clock</small>:null}
    {clock.delayed?<small className="mc-clock-note is-delayed" role="status">Update delayed · last confirmed minute</small>:null}
  </div>;
}
