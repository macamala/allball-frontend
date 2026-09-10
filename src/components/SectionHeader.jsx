import React from "react";
import { Link } from "react-router-dom";

export default function SectionHeader({ eyebrow, title, to, action = "See all" }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
      </div>
      {to && (
        <Link className="section-link" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}
