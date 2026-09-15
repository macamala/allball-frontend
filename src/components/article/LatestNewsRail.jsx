import React from "react";
import ArticleImage from "../ArticleImage.jsx";
import ArticleLink from "../ArticleLink.jsx";

export default function LatestNewsRail({ articles = [], currentSlug }) {
  const rows = articles.filter((item) => item?.slug && item.slug !== currentSlug).slice(0, 8);
  if (!rows.length) return null;
  return (
    <section className="rail-module" aria-label="Latest news">
      <h2 className="rail-title">Latest news</h2>
      <ul className="rail-list">
        {rows.map((article) => (
          <li key={article.id || article.slug}>
            <ArticleLink article={article} className="rail-item">
              <ArticleImage
                src={article.image_url}
                alt=""
                wrapperClassName="rail-thumb"
                variant="thumb"
              />
              <span>{article.title}</span>
            </ArticleLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
