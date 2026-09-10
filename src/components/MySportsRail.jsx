import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { MAIN_SPORTS } from "../config/sports.js";
import { sportLabel } from "../labels.js";

export default function MySportsRail() {
  const { favorites } = useAuth();
  const { t } = useI18n();
  const sports = (favorites?.sports || []).filter(Boolean);
  return (
    <section className="rail-module" aria-label={t("followedSports")}>
      <h2 className="rail-title">{t("followedSports")}</h2>
      {sports.length === 0 ? (
        <p className="rail-note">
          {t("favorites.hint")}{" "}
          <Link to="/my-sports">{t("nav.mySports")}</Link>
        </p>
      ) : (
        <ul className="rail-list">
          {sports.map((slug) => {
            const meta = MAIN_SPORTS.find((item) => item.slug === slug);
            return (
              <li key={slug}>
                <Link className="rail-item" to={slug === "other" ? "/other-sports" : `/${slug}`}>
                  <span>{meta?.label || sportLabel(slug)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
