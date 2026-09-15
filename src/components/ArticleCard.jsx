import React from "react";
import ArticleLink from "./ArticleLink.jsx";
import { articleDate, competitionLabel } from "../labels.js";
import { sportI18nKey } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";
import { isCrestMedia, publicMediaKind } from "../lib/mediaKind.js";
import { publicDeck } from "../lib/articleBlocks.js";
import ArticleImage from "./ArticleImage.jsx";

export default function ArticleCard({ article, variant = "grid" }) {
  const { t, dateLocale } = useI18n();
  if (!article) return null;
  const sportKey = sportI18nKey(article.sport);
  const sport = sportKey ? t(sportKey) : "";
  const league = article.league
    ? competitionLabel(article.league, article.league_label)
    : "";
  const dateStr = articleDate(article, dateLocale);
  const kind = publicMediaKind(article);
  const className = `article-card card-${variant}${isCrestMedia(kind) ? " is-crest" : ""}`;
  const deck = publicDeck(article.summary);

  return (
    <article className={className}>
      <ArticleLink article={article} className="article-card-link">
        <ArticleImage
          src={article.image_url}
          alt=""
          wrapperClassName="card-media"
          eager={variant === "lead"}
          mediaKind={kind}
        />
        <div className="article-card-body">
          <div className="pill-row">
            {sport && <span className="pill">{sport}</span>}
            {league && <span className="pill pill-league">{league}</span>}
          </div>
          <h3 className="article-card-title">{article.title}</h3>
          {variant !== "compact" && deck && (
            <p className="article-card-summary">{deck}</p>
          )}
          {dateStr && (
            <time
              className="article-card-date"
              dateTime={article.published_at || article.created_at}
            >
              {dateStr}
            </time>
          )}
        </div>
      </ArticleLink>
    </article>
  );
}
