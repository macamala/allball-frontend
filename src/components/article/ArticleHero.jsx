import React from "react";
import ArticleMediaBlock from "./ArticleMediaBlock.jsx";
import { isCrestMedia, MEDIA_KINDS, publicMediaKind } from "../../lib/mediaKind.js";

export default function ArticleHero({ media, article }) {
  const kind = publicMediaKind(article, media);
  if (!media?.url || kind === MEDIA_KINDS.MISSING) {
    return <div className="article-hero article-hero-empty" aria-hidden="true" />;
  }
  const crest = isCrestMedia(kind);
  return (
    <ArticleMediaBlock
      item={{ ...media, presentation: kind }}
      hero
      compact={crest}
      alt={article?.title || ""}
    />
  );
}
