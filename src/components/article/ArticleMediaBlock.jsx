import React from "react";
import ArticleImage from "../ArticleImage.jsx";
import { isPhotoCreditCaption } from "../../lib/articleBlocks.js";
import { isCrestMedia, publicMediaKind } from "../../lib/mediaKind.js";

export default function ArticleMediaBlock({
  item,
  hero = false,
  compact = false,
  alt = "",
}) {
  if (!item?.url) return null;
  const caption = (item.caption || "").trim();
  const hideCaption = hero || isPhotoCreditCaption(caption);
  const kind = publicMediaKind(null, item);
  const crest = compact || isCrestMedia(kind);
  const figureClass = hero
    ? `article-hero${crest ? " is-crest" : ""}`
    : `article-inline-media${crest ? " is-crest" : ""}`;
  const imgAlt = alt || (!hideCaption ? caption : "");
  return (
    <figure className={figureClass}>
      <ArticleImage
        src={item.url}
        alt={imgAlt}
        wrapperClassName={hero ? "article-hero-media" : "article-inline-frame"}
        eager={hero}
        mediaKind={kind}
      />
      {!hideCaption && caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
