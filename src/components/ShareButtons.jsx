import React, { useState } from "react";
import { CANONICAL_SITE } from "../labels.js";

export default function ShareButtons({ title, path }) {
  const url = `${CANONICAL_SITE}${path}`;
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title || "NinkoSports");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      setCopied(false);
    }
  };

  return (
    <div className="share-row">
      <span className="share-label">Share</span>
      <a
        className="share-btn"
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        X
      </a>
      <a
        className="share-btn"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Facebook
      </a>
      <a
        className="share-btn"
        href={`https://wa.me/?text=${text}%20${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>
      <button type="button" className="share-btn" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
