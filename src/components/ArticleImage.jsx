import React, { useEffect, useState } from "react";
import { isCrestMedia, MEDIA_KINDS } from "../lib/mediaKind.js";
import { imageUrlForDisplay } from "../lib/mediaUrl.js";

const SIZES = {
  thumb: "(max-width: 640px) 96px, 160px",
  card: "(max-width: 640px) 46vw, 400px",
  featured: "(max-width: 640px) 100vw, 1100px",
  hero: "(max-width: 640px) calc(100vw - 24px), 840px",
};

function sourceCandidates(src, fallbackSrc, variant, mediaKind, fallbackMediaKind) {
  const primaryRaw = String(src || "").trim();
  const fallbackRaw = String(fallbackSrc || "").trim();
  const rows = [
    {
      url: imageUrlForDisplay(primaryRaw, variant),
      kind: mediaKind || MEDIA_KINDS.UNKNOWN,
    },
    {
      url: primaryRaw,
      kind: mediaKind || MEDIA_KINDS.UNKNOWN,
    },
    {
      url: imageUrlForDisplay(fallbackRaw, variant),
      kind: fallbackMediaKind || mediaKind || MEDIA_KINDS.UNKNOWN,
    },
    {
      url: fallbackRaw,
      kind: fallbackMediaKind || mediaKind || MEDIA_KINDS.UNKNOWN,
    },
  ];

  const seen = new Set();
  return rows.filter((row) => {
    if (!row.url || row.kind === MEDIA_KINDS.MISSING || seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
}

export default function ArticleImage({
  src,
  fallbackSrc,
  alt = "",
  className = "",
  wrapperClassName = "",
  eager = false,
  mediaKind,
  fallbackMediaKind,
  width,
  height,
  variant = "card",
}) {
  const candidates = sourceCandidates(
    src,
    fallbackSrc,
    variant,
    mediaKind,
    fallbackMediaKind
  );
  const candidateKey = candidates.map((row) => `${row.url}|${row.kind}`).join("\n");
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [candidateKey]);

  const current = candidates[sourceIndex];
  const valid = Boolean(current?.url);
  const kind = current?.kind || MEDIA_KINDS.UNKNOWN;
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
        src={current.url}
        alt={alt}
        className={className}
        width={imgWidth}
        height={imgHeight}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchpriority={priority ? "high" : "auto"}
        sizes={SIZES[variant] || SIZES.card}
        onError={() => setSourceIndex((index) => index + 1)}
      />
    </div>
  );
}
