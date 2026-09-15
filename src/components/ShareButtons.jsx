import React, { useState } from "react";
import { CANONICAL_SITE } from "../labels.js";
import { useI18n } from "../context/I18nContext.jsx";
import { IconShare } from "./MobileIcons.jsx";

export default function ShareButtons({ title, path, compact = false }) {
  const { t } = useI18n();
  const url = `${CANONICAL_SITE}${path}`;
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title || "NinkoSports");
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      setCopied(false);
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: title || "NinkoSports",
          text: title || "NinkoSports",
          url,
        });
        return true;
      } catch (err) {
        if (err?.name === "AbortError") return true;
      }
    }
    return false;
  };

  const buttons = (
    <div className={compact ? "share-row share-fallback" : "share-row"}>
      {!compact ? <span className="share-label">{t("share")}</span> : null}
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
        {copied ? t("copied") : t("copyLink")}
      </button>
    </div>
  );

  if (!compact) return buttons;

  return (
    <div className="share-compact">
      <button
        type="button"
        className="action-chip"
        onClick={async () => {
          const shared = await nativeShare();
          if (!shared) setShowFallback(true);
        }}
      >
        <IconShare />
        <span>{t("share")}</span>
      </button>
      {showFallback ? buttons : null}
    </div>
  );
}
