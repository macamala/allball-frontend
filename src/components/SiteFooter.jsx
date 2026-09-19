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
        <p className="footer-data-sources">
          <Link to="/data-sources">{t("footer.dataSources")}</Link>
        </p>
        <nav className="footer-nav footer-nav-desktop" aria-label={t("nav.footer")}>
          <Link to="/">{t("nav.home")}</Link>
          <Link to="/football">{t("sport.football")}</Link>
          <Link to="/basketball">{t("sport.basketball")}</Link>
          <Link to="/live-scores">{t("liveScores")}</Link>
          <Link to="/predictions">{t("predictions")}</Link>
          <Link to="/search">{t("nav.search")}</Link>
          <Link to="/my-sports">{t("nav.mySports")}</Link>
          <Link to="/saved">{t("nav.saved")}</Link>
          <Link to="/login">{t("nav.login")}</Link>
        </nav>
      </div>
    </footer>
  );
}
