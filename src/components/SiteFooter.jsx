import React from "react";
import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-brand">NinkoSports</p>
        <p className="footer-copy">
          Original English sports coverage. Football, basketball, tennis and motorsport.
        </p>
        <nav className="footer-nav" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/football">Football</Link>
          <Link to="/basketball">Basketball</Link>
          <Link to="/live-scores">Live Scores</Link>
          <Link to="/search">Search</Link>
          <Link to="/my-sports">My Sports</Link>
        </nav>
      </div>
    </footer>
  );
}
