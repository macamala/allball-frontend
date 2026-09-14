import React from "react";
import ArticleImage from "../ArticleImage.jsx";
import { isCrestMedia, publicMediaKind } from "../../lib/mediaKind.js";

export default function ArticleMediaBlock({ item, hero = false, compact = false }) {
  if (!item?.url) return null;
  const caption = (item.caption || "").trim();
  const kind = publicMediaKind(null, item);
  const crest = compact || isCrestMedia(kind);
  const figureClass = hero
    ? `article-hero${crest ? " is-crest" : ""}`
    : `article-inline-media${crest ? " is-crest" : ""}`;
  return (
    <figure className={figureClass}>
      <ArticleImage
        src={item.url}
        alt={caption || (hero ? "" : "")}
        wrapperClassName={hero ? "article-hero-media" : "article-inline-frame"}
        eager={hero}
        mediaKind={kind}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
