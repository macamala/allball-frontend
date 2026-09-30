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
    for (const slug of JSON.parse(signature)) {
      getArticleTranslation(slug, lang, { priority: false }).then((row) => {
        if (!active || !row?.available) return;
        setResult((previous) => ({ lang, rows: {
          ...(previous.lang === lang ? previous.rows : {}), [slug]: row,
        } }));
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [signature, lang]);
  return articles.map((article) => {
    const row = result.lang === lang && lang !== "en" ? result.rows[article?.slug] : null;
    return row ? { ...article, title: row.title || article.title,
      summary: row.summary || article.summary, translation_language: lang } : article;
  });
}
