import React from "react";

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
