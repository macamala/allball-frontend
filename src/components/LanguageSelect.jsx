import React from "react";
import { LANGUAGES } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LanguageSelect({ id = "language-select" }) {
  const { lang, setLang, t } = useI18n();
  const { user, updateProfile } = useAuth();

  const onChange = async (event) => {
    const next = event.target.value;
    setLang(next);
    if (user) {
      try {
        await updateProfile({ preferred_language: next });
      } catch (err) {
        // Local language still updates.
      }
    }
  };

  return (
    <label className="language-select">
      <span className="sr-only">{t("nav.language")}</span>
      <select id={id} value={lang} onChange={onChange} aria-label={t("nav.language")}>
        {LANGUAGES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
