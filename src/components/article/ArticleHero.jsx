import React from "react";
import ArticleMediaBlock from "./ArticleMediaBlock.jsx";

export default function ArticleHero({ media }) {
  if (!media?.url) {
    return <div className="article-hero article-hero-empty" aria-hidden="true" />;
  }
  return <ArticleMediaBlock item={media} hero />;
}
