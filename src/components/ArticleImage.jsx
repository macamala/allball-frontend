import React, { useState } from "react";
import { isCrestMedia, MEDIA_KINDS } from "../lib/mediaKind.js";

export default function ArticleImage({
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  eager = false,
  mediaKind,
  width,
  height,
}) {
  const [failed, setFailed] = useState(false);
  const kind = mediaKind || MEDIA_KINDS.UNKNOWN;
  const valid = Boolean(src) && !failed && kind !== MEDIA_KINDS.MISSING;
  const crest = isCrestMedia(kind);
  const kindClass = crest ? "media-kind-crest" : "";
  const imgWidth = width || (crest ? 180 : undefined);
  const imgHeight = height || (crest ? 180 : undefined);

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
        width={imgWidth}
        height={imgHeight}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchpriority={eager ? "high" : "auto"}
        sizes={
          eager
            ? "(max-width: 640px) calc(100vw - 24px), 840px"
            : "(max-width: 640px) 46vw, 320px"
        }
        onError={() => setFailed(true)}
      />
    </div>
  );
}
