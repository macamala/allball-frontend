import React, { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getMobileBottomNav } from "../config/sports.js";
import { useI18n } from "../context/I18nContext.jsx";
import { useMobileNav } from "../context/MobileNavContext.jsx";
import {
  IconBasketball,
  IconFootball,
  IconHome,
  IconLive,
  IconMenu,
  IconMotorsport,
  IconOther,
  IconPredictions,
  IconTennis,
} from "./MobileIcons.jsx";

const ICONS = {
  home: IconHome,
  football: IconFootball,
  basketball: IconBasketball,
  predictions: IconPredictions,
  live: IconLive,
  tennis: IconTennis,
  motorsport: IconMotorsport,
  other: IconOther,
  more: IconMenu,
};

export default function MobileBottomNav() {
  const { t } = useI18n();
  const { open, setOpen } = useMobileNav();
  const location = useLocation();
  const scrollerRef = useRef(null);
  const items = React.useMemo(() => getMobileBottomNav(t), [t]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const active = scroller.querySelector(".bottom-nav-item.is-active, .bottom-nav-item.active");
    if (active?.scrollIntoView) {
      active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [location.pathname]);

  return (
    <nav className="mobile-bottom-nav" aria-label={t("nav.bottom")}>
      <div className="mobile-bottom-nav-scroller" ref={scrollerRef}>
        {items.map((item) => {
          const Icon = ICONS[item.icon] || IconHome;
          if (item.more) {
            return (
              <button
                key={item.id}
                type="button"
                className={open ? "bottom-nav-item is-active" : "bottom-nav-item"}
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setOpen(true)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          }
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={Boolean(item.end)}
              className="bottom-nav-item"
              onClick={() => setOpen(false)}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
