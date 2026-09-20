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
          {items.map((item) => {
            const name = item.name || item.provider || item.text;
            const key = item.provider || item.name || item.source_id || name;
            return (
              <li key={key} className="data-source-card">
                <div className="data-source-card-body">
                  {item.url ? (
                    <a href={item.url} rel="noreferrer">
                      {name}
                    </a>
                  ) : (
                    <span className="data-source-name">{name}</span>
                  )}
                  {item.description ? <p className="data-source-copy">{item.description}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="info-text">{payload?.message || t("dataSources.empty")}</p>
      )}
    </div>
  );
}
