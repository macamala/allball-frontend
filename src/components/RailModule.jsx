import React from "react";
import { Link } from "react-router-dom";
import ArticleImage from "./ArticleImage.jsx";

export default function RailModule({
  title,
  articles = [],
  currentSlug,
  ordered = false,
  emptyHidden = true,
}) {
  const rows = (articles || [])
    .filter((item) => item?.slug && item.slug !== currentSlug)
    .slice(0, 8);
  if (!rows.length && emptyHidden) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <section className="rail-module" aria-label={title}>
      <h2 className="rail-title">{title}</h2>
      <List className="rail-list">
        {rows.map((article) => (
          <li key={article.id || article.slug}>
            <Link to={`/article/${article.slug}`} className="rail-item">
              <ArticleImage
                src={article.image_url}
                alt=""
                wrapperClassName="rail-thumb"
              />
              <span>{article.title}</span>
            </Link>
          </li>
        ))}
      </List>
    </section>
  );
}
