import React from "react";
import ArticleImage from "../ArticleImage.jsx";

export default function ArticleMediaBlock({ item, hero = false }) {
  if (!item?.url) return null;
  const caption = (item.caption || "").trim();
  return (
    <figure className={hero ? "article-hero" : "article-inline-media"}>
      <ArticleImage
        src={item.url}
        alt={caption || (hero ? "" : "")}
        wrapperClassName={hero ? "article-hero-media" : "article-inline-frame"}
        eager={hero}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
