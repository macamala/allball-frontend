import React from "react";
import { Outlet } from "react-router-dom";
import { I18nProvider, useI18n } from "../context/I18nContext.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import SiteHeader from "./SiteHeader.jsx";
import SiteFooter from "./SiteFooter.jsx";

function Shell() {
  const { t } = useI18n();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("skip")}
      </a>
      <SiteHeader />
      <main id="main-content" className="page-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default function Layout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </I18nProvider>
  );
}
