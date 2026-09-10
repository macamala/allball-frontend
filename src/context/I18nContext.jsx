import React, { createContext, useContext, useMemo, useState } from "react";
import { LANGUAGES, readLanguage, translate, writeLanguage } from "../i18n/index.js";

const I18nContext = createContext({
  lang: "en",
  t: (key) => key,
  setLang: () => {},
  languages: LANGUAGES,
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => readLanguage());

  const value = useMemo(() => {
    const setLang = (next) => {
      setLangState(writeLanguage(next));
    };
    return {
      lang,
      setLang,
      languages: LANGUAGES,
      t: (key, vars) => translate(lang, key, vars),
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
