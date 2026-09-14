import React from "react";
import { Link } from "react-router-dom";
import { articleDate, competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";
import ArticleImage from "./ArticleImage.jsx";

export default function MostReadList({ articles = [] }) {
  const { t, dateLocale } = useI18n();
  if (!articles.length) return null;

  return (
    <ol className="most-read-list" aria-label={t("mostRead")}>
      {articles.map((article, index) => {
        const sportKey = sportI18nKey(article.sport);
        const sport = sportKey ? t(sportKey) : "";
        const league = article.league
          ? competitionLabel(article.league, article.league_label)
          : "";
        return (
          <li key={article.id || article.slug} className="most-read-item">
            <Link to={`/article/${article.slug}`} className="most-read-link">
              <span className="most-read-rank" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <ArticleImage
                src={article.image_url}
                alt=""
                wrapperClassName="most-read-thumb"
              />
              <div className="most-read-copy">
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
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
