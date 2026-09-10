import React from "react";
import { leaguePath, sportPath } from "../../config/sports.js";
import { articleDate, competitionLabel, sportLabel } from "../../labels.js";
import Breadcrumbs from "../Breadcrumbs.jsx";
import ArticleShare from "./ArticleShare.jsx";

export default function ArticleHeader({ article }) {
  const sport = sportLabel(article.sport, article.sport_label);
  const league = competitionLabel(article.league, article.league_label);
  const crumbs = [
    { name: "Home", path: "/" },
    article.sport ? { name: sport, path: sportPath(article.sport) } : null,
    article.league
      ? { name: league, path: leaguePath(article.sport, article.league) }
      : null,
    { name: article.title },
  ].filter(Boolean);
  const deck = (article.summary || "").trim();
  const showDeck =
    deck && deck.toLowerCase() !== String(article.title || "").toLowerCase();

  return (
    <header className="article-header">
      <Breadcrumbs items={crumbs} />
      <p className="article-kicker">
        {sport}
        {sport && league ? " · " : ""}
        {league}
        {article.is_breaking ? " · Breaking" : ""}
      </p>
      <h1 className="article-headline">{article.title}</h1>
      {showDeck ? <p className="article-deck">{deck}</p> : null}
      <div className="article-byline">
        {articleDate(article) && (
          <time dateTime={article.published_at || article.created_at}>
            {articleDate(article)}
          </time>
        )}
        {article.reading_time_minutes ? (
          <span>{article.reading_time_minutes} min read</span>
        ) : null}
      </div>
      <ArticleShare title={article.title} path={`/article/${article.slug}`} />
    </header>
  );
}
