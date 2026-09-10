import React from "react";

export default function PortalLayout({ left, right, children }) {
  return (
    <div className="portal-shell">
      {left ? (
        <aside className="portal-rail portal-left" aria-label="Supporting stories">
          {left}
        </aside>
      ) : null}
      <div className="portal-main">{children}</div>
      {right ? (
        <aside className="portal-rail portal-right" aria-label="Popular stories">
          {right}
        </aside>
      ) : null}
    </div>
  );
}
