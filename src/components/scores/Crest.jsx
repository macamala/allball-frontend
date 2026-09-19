import React, { useState } from "react";
import { crestInitial, flagEmoji, sideCountry, sideLogo } from "../../lib/identityAssets.js";
import { displayParticipantName } from "../../lib/participantDisplay.js";

export default function Crest({ side, fallbackCountry, size = 22, className = "" }) {
  const logo = sideLogo(side);
  const name = displayParticipantName(side);
  const [failed, setFailed] = useState(false);
  const flag = flagEmoji(sideCountry(side, fallbackCountry));

  if (logo && !failed) {
    return (
      <img
        className={`score-crest ${className}`.trim()}
        src={logo}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={`score-crest is-fallback ${className}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
      {flag || crestInitial(name)}
    </span>
  );
}
