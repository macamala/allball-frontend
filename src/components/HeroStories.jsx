import React from "react";
import { Link } from "react-router-dom";
import ArticleImage from "./ArticleImage.jsx";
import { articleDate, competitionLabel, sportLabel } from "../labels.js";

export default function HeroStories({ articles = [] }) {
  if (!articles.length) return null;
  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 4);

  return (
    <section className="hero-grid" aria-label="Top stories">
      <article className="hero-lead">
        <Link to={`/article/${lead.slug}`} className="hero-lead-link">
          <ArticleImage
            src={lead.image_url}
            alt=""
            wrapperClassName="hero-lead-media"
            eager
          />
          <div className="hero-lead-copy">
            <div className="pill-row">
              {lead.sport && (
                <span className="pill">{sportLabel(lead.sport, lead.sport_label)}</span>
              )}
              {lead.league && (
                <span className="pill pill-league">
                  {competitionLabel(lead.league, lead.league_label)}
                </span>
              )}
            </div>
            <h1>{lead.title}</h1>
            {lead.summary && <p>{lead.summary}</p>}
            <time dateTime={lead.published_at || lead.created_at}>
              {articleDate(lead)}
            </time>
          </div>
        </Link>
      </article>
      <div className="hero-side">
        {secondary.map((article) => (
          <article key={article.slug} className="hero-side-item">
            <Link to={`/article/${article.slug}`}>
              <ArticleImage
                src={article.image_url}
                alt=""
                wrapperClassName="hero-side-media"
              />
              <div>
                <span className="pill">
                  {sportLabel(article.sport, article.sport_label)}
                </span>
                <h2>{article.title}</h2>
                <time dateTime={article.published_at || article.created_at}>
                  {articleDate(article)}
                </time>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
