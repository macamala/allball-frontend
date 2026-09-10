import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../assets/logo-ninkosports.png";
import { PRIMARY_NAV } from "../config/sports.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import LanguageSelect from "./LanguageSelect.jsx";
import SearchBox from "./SearchBox.jsx";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-header-brand">
          <img
            src={logo}
            alt="NinkoSports"
            className="site-header-logo"
            width="52"
            height="52"
          />
          <span className="site-header-name">NinkoSports</span>
        </Link>

        <nav className="desktop-nav" aria-label="Main">
          {PRIMARY_NAV.map((item) => (
            <div
              className={item.children ? "nav-item has-children" : "nav-item"}
              key={item.path}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) => (isActive ? "nav-link is-active" : "nav-link")}
                end={item.path === "/"}
              >
                {item.label}
              </NavLink>
              {item.children && (
                <div className="nav-dropdown" role="group" aria-label={`${item.label} competitions`}>
                  {item.children.map((child) => (
                    <Link key={child.path} to={child.path}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="header-tools">
          <SearchBox compact value={query} onChange={setQuery} />
          <LanguageSelect id="header-language" />
          <Link className="favorites-link" to="/my-sports">
            {t("nav.mySports")}
          </Link>
          {user ? (
            <Link className="account-link" to="/profile">
              {user.display_name || t("nav.profile")}
            </Link>
          ) : (
            <Link className="account-link" to="/login">
              {t("nav.login")}
            </Link>
          )}
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t("nav.close") : t("nav.menu")}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={open ? "mobile-nav is-open" : "mobile-nav"}
        hidden={!open}
      >
        <SearchBox value={query} onChange={setQuery} />
        <LanguageSelect id="mobile-language" />
        <nav aria-label="Mobile">
          {PRIMARY_NAV.map((item) => (
            <div key={item.path} className="mobile-group">
              <NavLink to={item.path}>{item.label}</NavLink>
              {item.children && (
                <div className="mobile-sub">
                  {item.children.map((child) => (
                    <Link key={child.path} to={child.path}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link to="/my-sports">{t("nav.mySports")}</Link>
          <Link to="/saved">{t("nav.saved")}</Link>
          {user ? (
            <>
              <Link to="/profile">{t("nav.profile")}</Link>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login">{t("nav.login")}</Link>
              <Link to="/register">{t("nav.register")}</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
