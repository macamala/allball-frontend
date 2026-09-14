import React from "react";
import { Link } from "react-router-dom";
import { articleDate, competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";
import ArticleImage from "./ArticleImage.jsx";

function StoryMeta({ article, t }) {
  const sportKey = sportI18nKey(article.sport);
  const sport = sportKey ? t(sportKey) : "";
  const league = article.league
    ? competitionLabel(article.league, article.league_label)
    : "";
  return (
    <p className="meta-kicker">
      {sport}
      {sport && league ? " · " : ""}
      {league}
    </p>
  );
}

export default function SportDesk({ articles = [] }) {
  const { t, dateLocale } = useI18n();
  if (!articles.length) return null;
  const [lead, ...rest] = articles;
  const supporting = rest.slice(0, 3);

  return (
    <div className="sport-desk">
      <article className="sport-desk-lead">
        <Link to={`/article/${lead.slug}`} className="sport-desk-lead-link">
          <ArticleImage
            src={lead.image_url}
            alt=""
            wrapperClassName="sport-desk-lead-media"
          />
          <div className="sport-desk-lead-copy">
            <StoryMeta article={lead} t={t} />
            <h3>{lead.title}</h3>
            <time dateTime={lead.published_at || lead.created_at}>
              {articleDate(lead, dateLocale)}
            </time>
          </div>
        </Link>
      </article>
      {supporting.length > 0 && (
        <div className="sport-desk-support">
          {supporting.map((article) => (
            <article key={article.id || article.slug} className="sport-desk-item">
              <Link to={`/article/${article.slug}`} className="sport-desk-item-link">
                <ArticleImage
                  src={article.image_url}
                  alt=""
                  wrapperClassName="sport-desk-thumb"
                />
                <div>
                  <StoryMeta article={article} t={t} />
                  <h3>{article.title}</h3>
                  <time dateTime={article.published_at || article.created_at}>
                    {articleDate(article, dateLocale)}
                  </time>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
