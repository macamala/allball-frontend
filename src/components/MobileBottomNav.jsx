import React from "react";
import { NavLink } from "react-router-dom";
import { useI18n } from "../context/I18nContext.jsx";
import { useMobileNav } from "../context/MobileNavContext.jsx";
import {
  IconBasketball,
  IconFootball,
  IconHome,
  IconLive,
  IconMenu,
} from "./MobileIcons.jsx";

export default function MobileBottomNav() {
  const { t } = useI18n();
  const { open, setOpen } = useMobileNav();

  return (
    <nav className="mobile-bottom-nav" aria-label={t("nav.bottom")}>
      <NavLink to="/" end className="bottom-nav-item">
        <IconHome />
        <span>{t("nav.home")}</span>
      </NavLink>
      <NavLink to="/football" className="bottom-nav-item">
        <IconFootball />
        <span>{t("sport.football")}</span>
      </NavLink>
      <NavLink to="/basketball" className="bottom-nav-item">
        <IconBasketball />
        <span>{t("sport.basketball")}</span>
      </NavLink>
      <NavLink to="/live-scores" className="bottom-nav-item">
        <IconLive />
        <span>{t("nav.live")}</span>
      </NavLink>
      <button
        type="button"
        className={open ? "bottom-nav-item is-active" : "bottom-nav-item"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
      >
        <IconMenu />
        <span>{t("nav.more")}</span>
      </button>
    </nav>
  );
}
