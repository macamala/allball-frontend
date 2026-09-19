import React, { useEffect, useState } from "react";
import { getDataSources } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import { useI18n } from "../context/I18nContext.jsx";

export default function DataSourcesPage() {
  const { t } = useI18n();
  const [payload, setPayload] = useState({ items: [] });

  useEffect(() => {
    setPageSeo({
      title: `${t("dataSources.title")} | NinkoSports`,
      description: t("dataSources.lede"),
      path: "/data-sources",
    });
    getDataSources()
      .then(setPayload)
      .catch(() => setPayload({ items: [] }));
  }, [t]);

  const items = Array.isArray(payload?.items) ? payload.items : [];

  return (
    <div className="page-data-sources">
      <h1>{t("dataSources.title")}</h1>
      <p className="lede">{t("dataSources.lede")}</p>
      {items.length ? (
        <ul className="data-source-list">
          {items.map((item) => (
            <li key={item.source_id || item.text}>
              {item.url ? (
                <a href={item.url} rel="noreferrer">
                  {item.text}
                </a>
              ) : (
                <span>{item.text}</span>
              )}
              {item.license_name ? (
                <span className="data-source-license">{item.license_name}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="info-text">{payload?.message || t("dataSources.empty")}</p>
      )}
    </div>
  );
}
