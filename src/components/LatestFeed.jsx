import React from "react";
import ArticleLink from "./ArticleLink.jsx";
import { articleDate, competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";
import ArticleImage from "./ArticleImage.jsx";

export default function LatestFeed({ articles = [] }) {
  const { t, dateLocale } = useI18n();
  if (!articles.length) return null;

  return (
    <div className="latest-feed news-stream" aria-label={t("latest")}>
      {articles.map((article) => {
        const sportKey = sportI18nKey(article.sport);
        const sport = sportKey ? t(sportKey) : "";
        const league = article.league
          ? competitionLabel(article.league, article.league_label)
          : "";
        return (
          <article key={article.id || article.slug} className="news-stream-item">
            <ArticleLink article={article} className="news-stream-link">
              <ArticleImage
                src={article.image_url}
                alt=""
                wrapperClassName="news-stream-thumb"
                variant="thumb"
              />
              <div className="news-stream-copy">
                <p className="meta-kicker">
                  {sport}
                  {sport && league ? " · " : ""}
                  {league}
                </p>
                <h3>{article.title}</h3>
                <time dateTime={article.published_at || article.created_at}>
                  {articleDate(article, dateLocale)}
                </time>
              </div>
            </ArticleLink>
          </article>
        );
      })}
    </div>
  );
}
