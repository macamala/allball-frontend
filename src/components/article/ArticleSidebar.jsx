import React from "react";
import ArticleLink from "../ArticleLink.jsx";
import LatestNewsRail from "./LatestNewsRail.jsx";

export default function ArticleSidebar({
  latest = [],
  mostRead = [],
  currentSlug,
  scores,
}) {
  const live =
    scores?.connected && Array.isArray(scores.matches) && scores.matches.length > 0
      ? scores.matches
      : [];
  const ranked = (mostRead || []).filter((item) => item?.slug && item.slug !== currentSlug);

  return (
    <aside className="article-sidebar">
      <LatestNewsRail articles={latest} currentSlug={currentSlug} />
      {ranked.length > 0 && (
        <section className="rail-module" aria-label="Most read">
          <h2 className="rail-title">Most read</h2>
          <ol className="rail-list">
            {ranked.slice(0, 6).map((article) => (
              <li key={article.id || article.slug}>
                <ArticleLink className="rail-item" article={article}>
                  <span>{article.title}</span>
                </ArticleLink>
              </li>
            ))}
          </ol>
        </section>
      )}
      {live.length > 0 && (
        <section className="rail-module" aria-label="Live scores">
          <h2 className="rail-title">Live scores</h2>
          <p className="rail-note">Scores appear when live data is connected.</p>
        </section>
      )}
    </aside>
  );
}
