import React from "react";
import { Link } from "react-router-dom";
import logo from "./assets/logo-ninkosports.png";

function SiteHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="site-header-brand">
        <img src={logo} alt="NinkoSports" className="site-header-logo" />
        <span className="site-header-name">NinkoSports</span>
      </Link>
      <nav className="site-header-nav">
        <Link to="/">News</Link>
      </nav>
    </header>
  );
}

export default SiteHeader;
