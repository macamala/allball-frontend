import React from "react";

export default function PortalLayout({ left, right, children }) {
  const areas = [
    left ? "has-left" : "",
    right ? "has-right" : "",
    !left && !right ? "is-expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`portal-shell ${areas}`.trim()}>
      {left ? (
        <aside className="portal-rail portal-left" aria-label="Live">
          {left}
        </aside>
      ) : null}
      <div className="portal-main">{children}</div>
      {right ? (
        <aside className="portal-rail portal-right" aria-label="Live">
          {right}
        </aside>
      ) : null}
    </div>
  );
}
