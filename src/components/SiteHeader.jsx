import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../assets/logo-ninkosports.png";
import { PRIMARY_NAV } from "../config/sports.js";
import SearchBox from "./SearchBox.jsx";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();

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
          <img src={logo} alt="" className="site-header-logo" width="36" height="36" />
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
          <Link className="favorites-link" to="/my-sports">
            My Sports
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={open ? "mobile-nav is-open" : "mobile-nav"}
        hidden={!open}
      >
        <SearchBox value={query} onChange={setQuery} />
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
          <Link to="/my-sports">My Sports / Favorites</Link>
        </nav>
      </div>
    </header>
  );
}
