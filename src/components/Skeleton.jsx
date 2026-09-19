import React from "react";

export function ScoreBoardSkeleton({ groups = 3, rows = 4 }) {
  return (
    <div className="score-groups" aria-busy="true" aria-label="Loading">
      {Array.from({ length: groups }).map((_, groupIndex) => (
        <section className="score-comp score-comp-skeleton" key={groupIndex}>
          <header className="score-comp-head">
            <span className="score-comp-mark skeleton-line" />
            <div className="score-comp-copy">
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
            </div>
          </header>
          <ul className="score-comp-list">
            {Array.from({ length: rows }).map((__, rowIndex) => (
              <li className="score-row is-skeleton" key={rowIndex}>
                <div className="score-row-link">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-media" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

export function ArticleBodySkeleton() {
  return (
    <div className="article-body article-body-skeleton" aria-hidden="true">
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="hero-grid" aria-hidden="true">
      <div className="skeleton-card skeleton-lead">
        <div className="skeleton-media tall" />
        <div className="skeleton-line" />
      </div>
      <div className="hero-side">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="skeleton-card" key={index}>
            <div className="skeleton-media" />
          </div>
        ))}
      </div>
    </div>
  );
}
