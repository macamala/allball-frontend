import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { IconBookmark } from "./MobileIcons.jsx";

export default function SaveButton({ article, compact = false }) {
  const { saved, toggleSave } = useAuth();
  const { t } = useI18n();
  if (!article) return null;
  const on = saved.some((item) => item.id === article.id || item.slug === article.slug);
  const label = on ? t("saved") : compact ? t("save.short") : t("save");
  if (compact) {
    return (
      <button
        type="button"
        className={on ? "action-chip is-on" : "action-chip"}
        onClick={() => toggleSave(article)}
        aria-pressed={on}
      >
        <IconBookmark />
        <span>{label}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={on ? "btn btn-ghost is-on" : "btn btn-ghost"}
      onClick={() => toggleSave(article)}
      aria-pressed={on}
    >
      {label}
    </button>
  );
}
