import React from "react";
import { Link } from "react-router-dom";
import ArticleImage from "../ArticleImage.jsx";

export default function InlineRelatedStory({ article }) {
  if (!article?.slug || !article?.title) return null;
  return (
    <aside className="inline-related" aria-label="Related story">
      <p className="inline-related-label">Related</p>
      <Link to={`/article/${article.slug}`} className="inline-related-link">
        <ArticleImage
          src={article.image_url}
          alt=""
          wrapperClassName="inline-related-media"
        />
        <span className="inline-related-title">{article.title}</span>
      </Link>
    </aside>
  );
}
