import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { prefetchArticle } from "../api.js";

export function articlePreview(article) {
  if (!article?.slug) return null;
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    image_url: article.image_url,
    sport: article.sport,
    league: article.league,
    sport_label: article.sport_label,
    league_label: article.league_label,
    published_at: article.published_at,
    created_at: article.created_at,
    is_breaking: article.is_breaking,
    hero_media_kind: article.hero_media_kind,
  };
}

export default function ArticleLink({ article, className, children, ...rest }) {
  const timer = useRef(0);
  const slug = article?.slug;
  const preview = articlePreview(article);
  if (!slug) return children || null;

  const clearPrefetch = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = 0;
    }
  };

  const schedulePrefetch = () => {
    clearPrefetch();
    timer.current = window.setTimeout(() => prefetchArticle(slug), 75);
  };

  return (
    <Link
      to={`/article/${slug}`}
      className={className}
      state={preview ? { preview } : undefined}
      onPointerEnter={schedulePrefetch}
      onPointerLeave={clearPrefetch}
      onFocus={() => prefetchArticle(slug)}
      onBlur={clearPrefetch}
      {...rest}
    >
      {children}
    </Link>
  );
}
