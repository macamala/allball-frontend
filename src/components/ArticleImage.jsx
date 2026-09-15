import React, { useState } from "react";
import { isCrestMedia, MEDIA_KINDS } from "../lib/mediaKind.js";
import { imageUrlForDisplay } from "../lib/mediaUrl.js";

const SIZES = {
  thumb: "(max-width: 640px) 96px, 160px",
  card: "(max-width: 640px) 46vw, 400px",
  featured: "(max-width: 640px) 100vw, 1100px",
  hero: "(max-width: 640px) calc(100vw - 24px), 840px",
};

export default function ArticleImage({
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  eager = false,
  mediaKind,
  width,
  height,
  variant = "card",
}) {
  const [failed, setFailed] = useState(false);
  const kind = mediaKind || MEDIA_KINDS.UNKNOWN;
  const displaySrc = imageUrlForDisplay(src, variant);
  const valid = Boolean(displaySrc) && !failed && kind !== MEDIA_KINDS.MISSING;
  const crest = isCrestMedia(kind);
  const kindClass = crest ? "media-kind-crest" : "";
  const imgWidth = width || (crest ? 180 : undefined);
  const imgHeight = height || (crest ? 180 : undefined);
  const priority = eager || variant === "featured" || variant === "hero";

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
        src={displaySrc}
        alt={alt}
        className={className}
        width={imgWidth}
        height={imgHeight}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchpriority={priority ? "high" : "auto"}
        sizes={SIZES[variant] || SIZES.card}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
