import React, { useState } from "react";
import { flagImageUrl } from "../../lib/identityAssets.js";

export default function CountryFlag({ countryId, label = "", size = 20, className = "" }) {
  const src = flagImageUrl(countryId);
  const [failedSrc, setFailedSrc] = useState("");
  if (!src) return null;
  if (failedSrc === src) {
    return <span className={className} data-asset-missing="country-flag" aria-label={`${label || countryId} flag unavailable`}>◻</span>;
  }
  return (
    <img className={className} data-country-flag={countryId} src={src}
      alt={label || String(countryId)} width={size} height={size}
      style={{ display: "inline-block", objectFit: "contain", flexShrink: 0, verticalAlign: "middle" }}
      loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />
  );
}
