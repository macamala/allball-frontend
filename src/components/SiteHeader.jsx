import React from "react";
import { Link, NavLink } from "react-router-dom";
import logo from "../assets/logo-ninkosports.png";
import { getPrimaryNav } from "../config/sports.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { useMobileNav } from "../context/MobileNavContext.jsx";
import { IconMenu, IconSearch } from "./MobileIcons.jsx";
import LanguageSelect from "./LanguageSelect.jsx";
import SearchBox from "./SearchBox.jsx";

export default function SiteHeader() {
  const [query, setQuery] = React.useState("");
  const { open, toggle } = useMobileNav();
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = React.useMemo(() => getPrimaryNav(t), [t]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-header-brand">
          <img
            src={logo}
            alt="NinkoSports"
            className="site-header-logo"
            width="64"
            height="64"
          />
          <span className="site-header-name">NinkoSports</span>
        </Link>

        <nav className="desktop-nav" aria-label={t("nav.main")}>
          {nav.map((item) => (
            <div
              className={item.children ? "nav-item has-children" : "nav-item"}
              key={item.path}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  [
                    "nav-link",
                    isActive ? "is-active" : "",
                    item.path === "/live-scores" ? "nav-live" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                end={item.path === "/"}
              >
                {item.label}
              </NavLink>
              {item.children && (
                <div className="nav-dropdown" role="group" aria-label={item.label}>
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
          <Link
            to="/search"
            className="header-icon-btn header-search-icon"
            aria-label={t("nav.search")}
          >
            <IconSearch />
          </Link>
          <button
            type="button"
            className="menu-toggle header-icon-btn"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t("nav.menu")}
            onClick={toggle}
          >
            <IconMenu />
          </button>
        </div>
      </div>
    </header>
  );
}
