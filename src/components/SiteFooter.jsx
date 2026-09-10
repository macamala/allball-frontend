import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext.jsx";

export default function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-brand">NinkoSports</p>
        <p className="footer-copy">{t("footer.copy")}</p>
        <nav className="footer-nav" aria-label="Footer">
          <Link to="/">{t("nav.home")}</Link>
          <Link to="/football">Football</Link>
          <Link to="/basketball">Basketball</Link>
          <Link to="/live-scores">Live Scores</Link>
          <Link to="/search">{t("nav.search")}</Link>
          <Link to="/my-sports">{t("nav.mySports")}</Link>
          <Link to="/saved">{t("nav.saved")}</Link>
          <Link to="/login">{t("nav.login")}</Link>
        </nav>
      </div>
    </footer>
  );
}
