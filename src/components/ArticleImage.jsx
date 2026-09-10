import React, { useState } from "react";

export default function ArticleImage({
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  eager = false,
}) {
  const [failed, setFailed] = useState(false);
  const valid = Boolean(src) && !failed;

  if (!valid) {
    return (
      <div
        className={`media-fallback ${wrapperClassName}`.trim()}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`media-frame ${wrapperClassName}`.trim()}>
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
