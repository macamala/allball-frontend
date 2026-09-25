import React, { useEffect, useState } from "react";
import { crestInitial, flagImageUrl, sideCountries, sideLogo } from "../../lib/identityAssets.js";

import CountryFlag from "./CountryFlag.jsx";

export default function Crest({ side, fallbackCountry, size = 22, className = "" }) {
  const logo = sideLogo(side);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  const flags = sideCountries(side, fallbackCountry).filter((value) => flagImageUrl(value));
  const flag = flags[0] || "";

  if (logo && !failed) {
    return (
      <img
        className={`score-crest ${className}`.trim()}
        src={logo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  const initials = crestInitial(side?.display_name || side?.name || "");
  return (
    <span
      className={`score-crest is-fallback ${flag ? "has-flag" : "is-missing"} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
      data-asset-missing={flag ? undefined : "true"}
    >
      {flags.length > 1 ? (
        <span className="score-crest-flags">{flags.slice(0, 2).map((item, index) => <CountryFlag key={`${item}-${index}`} countryId={item} size={Math.max(12, size / 2)} />)}</span>
      ) : (
        flag ? <CountryFlag countryId={flag} size={size} /> : initials
      )}
    </span>
  );
}
