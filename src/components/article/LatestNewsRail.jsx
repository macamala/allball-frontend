import React from "react";
import { Link } from "react-router-dom";
import ArticleImage from "../ArticleImage.jsx";

export default function LatestNewsRail({ articles = [], currentSlug }) {
  const rows = articles.filter((item) => item?.slug && item.slug !== currentSlug).slice(0, 8);
  if (!rows.length) return null;
  return (
    <section className="rail-module" aria-label="Latest news">
      <h2 className="rail-title">Latest news</h2>
      <ul className="rail-list">
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
      </ul>
    </section>
  );
}
