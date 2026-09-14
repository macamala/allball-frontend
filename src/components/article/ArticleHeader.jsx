import React from "react";
import { leaguePath, sportPath } from "../../config/sports.js";
import { articleDate, competitionLabel } from "../../labels.js";
import { sportI18nKey } from "../../i18n/index.js";
import { useI18n } from "../../context/I18nContext.jsx";
import Breadcrumbs from "../Breadcrumbs.jsx";
import SaveButton from "../SaveButton.jsx";
import ArticleShare from "./ArticleShare.jsx";

export default function ArticleHeader({ article }) {
  const { t, dateLocale } = useI18n();
  const sportKey = sportI18nKey(article.sport);
  const sport = sportKey ? t(sportKey) : "";
  const league = article.league
    ? competitionLabel(article.league, article.league_label)
    : "";
  const crumbs = [
    { name: t("nav.home"), path: "/" },
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
        {article.is_breaking ? ` · ${t("breaking")}` : ""}
      </p>
      <h1 className="article-headline">{article.title}</h1>
      {showDeck ? <p className="article-deck">{deck}</p> : null}
      <div className="article-meta-row">
        <div className="article-byline">
          {articleDate(article, dateLocale) && (
            <time dateTime={article.published_at || article.created_at}>
              {articleDate(article, dateLocale)}
            </time>
          )}
          {article.reading_time_minutes ? (
            <span>{t("minRead", { n: article.reading_time_minutes })}</span>
          ) : null}
        </div>
        <div className="article-actions" aria-label={t("article.actions")}>
          <ArticleShare title={article.title} path={`/article/${article.slug}`} />
          <SaveButton article={article} />
        </div>
      </div>
    </header>
  );
}
