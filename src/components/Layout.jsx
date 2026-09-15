import React from "react";
import { Outlet } from "react-router-dom";
import { I18nProvider, useI18n } from "../context/I18nContext.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { MobileNavProvider } from "../context/MobileNavContext.jsx";
import SiteHeader from "./SiteHeader.jsx";
import SiteFooter from "./SiteFooter.jsx";
import MobileNavDrawer from "./MobileNavDrawer.jsx";
import MobileBottomNav from "./MobileBottomNav.jsx";

function Shell() {
  const { t } = useI18n();
  return (
    <MobileNavProvider>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          {t("skip")}
        </a>
        <SiteHeader />
        <MobileNavDrawer />
        <main id="main-content" className="page-main">
          <Outlet />
        </main>
        <SiteFooter />
        <MobileBottomNav />
      </div>
    </MobileNavProvider>
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
