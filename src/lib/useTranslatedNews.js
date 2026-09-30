import { useEffect, useState } from "react";
import { getArticleTranslation } from "../api.js";
import { useI18n } from "../context/I18nContext.jsx";

// Reads only existing server translations; browsing never triggers paid AI.
export function useTranslatedNews(articles) {
  const { lang = "en" } = useI18n();
  const slugs = [...new Set(articles.map((article) => article?.slug).filter(Boolean))];
  const signature = JSON.stringify(slugs);
  const [result, setResult] = useState({ lang: "en", rows: {} });
  useEffect(() => {
    let active = true;
    if (lang === "en") return () => { active = false; };
    const missing = new Set(JSON.parse(signature));
    let timer;
    const read = async (refresh = false) => {
      if (!active) return;
      if (!document.hidden) await Promise.all([...missing].map(async (slug) => {
        try {
          const row = await getArticleTranslation(slug, lang, { priority: false, refresh });
          if (!active || !row?.available) return;
          missing.delete(slug);
          setResult((previous) => ({ lang, rows: {
            ...(previous.lang === lang ? previous.rows : {}), [slug]: row,
          } }));
        } catch { /* The next read can recover a temporary network failure. */ }
      }));
      if (active && missing.size) timer = setTimeout(() => read(true), 60000);
    };
    read();
    return () => { active = false; clearTimeout(timer); };
  }, [signature, lang]);
  return articles.map((article) => {
    const row = result.lang === lang && lang !== "en" ? result.rows[article?.slug] : null;
    return row ? { ...article, title: row.title || article.title,
      summary: row.summary || article.summary, translation_language: lang } : article;
  });
}
