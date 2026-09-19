import React, { useEffect, useMemo, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { getPrimaryNav } from "../config/sports.js";
import { CATEGORY_I18N, groupedDirectorySports } from "../config/sportsRegistry.js";
import { sportI18nKey } from "../i18n/index.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { useMobileNav } from "../context/MobileNavContext.jsx";
import { IconClose } from "./MobileIcons.jsx";
import LanguageSelect from "./LanguageSelect.jsx";
import SearchBox from "./SearchBox.jsx";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function MobileNavDrawer() {
  const { open, setOpen } = useMobileNav();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = useMemo(() => getPrimaryNav(t), [t]);
  const [query, setQuery] = React.useState("");
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const panel = panelRef.current;
    const onKey = (event) => {
      if (event.key !== "Tab" || !panel) return;
      const nodes = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (node) => !node.hasAttribute("disabled")
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel?.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      panel?.removeEventListener("keydown", onKey);
      if (lastFocus.current?.focus) lastFocus.current.focus();
    };
  }, [open]);

  const home = nav.find((item) => item.path === "/");
  const live = nav.find((item) => item.path === "/live-scores");
  const predictions = nav.find((item) => item.path === "/predictions");
  const sports = nav.filter(
    (item) =>
      item.path !== "/" && item.path !== "/live-scores" && item.path !== "/predictions"
  );

  return (
    <div
      className={open ? "mobile-drawer is-open" : "mobile-drawer"}
      hidden={!open}
    >
      <div
        className="mobile-drawer-overlay"
        onClick={() => setOpen(false)}
      />
      <aside
        ref={panelRef}
        id="mobile-nav"
        className="mobile-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-drawer-title"
      >
        <div className="mobile-drawer-chrome">
          <h2 id="mobile-drawer-title" className="mobile-drawer-title">
            NinkoSports
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="header-icon-btn mobile-drawer-close"
            data-drawer-close="true"
            aria-label={t("nav.close")}
            onClick={() => setOpen(false)}
          >
            <IconClose />
          </button>
        </div>
        <div className="mobile-drawer-scroll">
          <div className="drawer-block">
            <p className="drawer-label">{t("nav.search")}</p>
            <SearchBox value={query} onChange={setQuery} autoFocus={false} />
          </div>

          {home ? (
            <div className="drawer-block">
              <p className="drawer-label">{home.label}</p>
              <NavLink to={home.path} className="drawer-link" end>
                {home.label}
              </NavLink>
            </div>
          ) : null}

          {live ? (
            <div className="drawer-block">
              <p className="drawer-label">{live.label}</p>
              <NavLink to={live.path} className="drawer-link">
                {live.label}
              </NavLink>
            </div>
          ) : null}

          {predictions ? (
            <div className="drawer-block">
              <p className="drawer-label">{predictions.label}</p>
              <NavLink to={predictions.path} className="drawer-link">
                {predictions.label}
              </NavLink>
            </div>
          ) : null}

          {sports.map((item) => (
            <div key={item.path} className="drawer-block mobile-group">
              <p className="drawer-label">{item.label}</p>
              <NavLink to={item.path} className="drawer-link">
                {item.label}
              </NavLink>
              {item.children?.length ? (
                <div className="mobile-sub">
                  {item.children.map((child) => (
                    <Link key={child.path} to={child.path} className="drawer-sublink">
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {groupedDirectorySports().map((group) => (
            <div key={group.category} className="drawer-block mobile-group">
              <p className="drawer-label">{t(CATEGORY_I18N[group.category] || "other.directory")}</p>
              <div className="mobile-sub">
                {group.items.map((item) => (
                  <NavLink key={item.slug} to={item.path} className="drawer-sublink">
                    {t(sportI18nKey(item.slug)) || item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div className="drawer-block">
            <p className="drawer-label">{t("nav.personal")}</p>
            <nav aria-label={t("nav.mobile")}>
              <Link className="drawer-link" to="/my-sports">
                {t("nav.mySports")}
              </Link>
              <Link className="drawer-link" to="/saved">
                {t("nav.saved")}
              </Link>
              {user ? (
                <>
                  <Link className="drawer-link" to="/profile">
                    {t("nav.profile")}
                  </Link>
                  <button type="button" className="drawer-link drawer-button" onClick={logout}>
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link className="drawer-link" to="/login">
                    {t("nav.login")}
                  </Link>
                  <Link className="drawer-link" to="/register">
                    {t("nav.register")}
                  </Link>
                </>
              )}
              <Link className="drawer-link" to="/data-sources">
                {t("footer.dataSources")}
              </Link>
            </nav>
          </div>

          <div className="drawer-block drawer-language">
            <p className="drawer-label">{t("nav.language")}</p>
            <LanguageSelect id="mobile-language" />
          </div>
        </div>
      </aside>
    </div>
  );
}
