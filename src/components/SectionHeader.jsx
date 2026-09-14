import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext.jsx";

export default function SectionHeader({ eyebrow, title, to, action, id }) {
  const { t } = useI18n();
  const linkLabel = action || t("seeAll");
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 className="section-title" id={id}>
          {title}
        </h2>
      </div>
      {to && (
        <Link className="section-link" to={to}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
