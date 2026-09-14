import React, { useState } from "react";
import { isCrestMedia, MEDIA_KINDS } from "../lib/mediaKind.js";

export default function ArticleImage({
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  eager = false,
  mediaKind,
}) {
  const [failed, setFailed] = useState(false);
  const kind = mediaKind || MEDIA_KINDS.UNKNOWN;
  const valid = Boolean(src) && !failed && kind !== MEDIA_KINDS.MISSING;
  const kindClass = isCrestMedia(kind) ? "media-kind-crest" : "";

  if (!valid) {
    return (
      <div
        className={`media-fallback ${wrapperClassName}`.trim()}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`media-frame ${kindClass} ${wrapperClassName}`.trim()}>
      <img
        src={src}
        alt={alt}
        className={className}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
