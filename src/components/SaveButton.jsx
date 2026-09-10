import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";

export default function SaveButton({ article }) {
  const { saved, toggleSave } = useAuth();
  const { t } = useI18n();
  if (!article) return null;
  const on = saved.some((item) => item.id === article.id || item.slug === article.slug);
  return (
    <button
      type="button"
      className={on ? "btn btn-ghost is-on" : "btn btn-ghost"}
      onClick={() => toggleSave(article)}
      aria-pressed={on}
    >
      {on ? t("saved") : t("save")}
    </button>
  );
}
