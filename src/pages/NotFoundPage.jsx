import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setPageSeo } from "../lib/seo.js";
import EmptyState from "../components/EmptyState.jsx";

export default function NotFoundPage() {
  useEffect(() => {
    setPageSeo({
      title: "Page not found | NinkoSports",
      description: "That NinkoSports page does not exist.",
      path: "/404",
    });
  }, []);

  return (
    <EmptyState
      title="Page not found"
      body="The page you requested is not available."
      action={
        <Link to="/" className="btn">
          Back to home
        </Link>
      }
    />
  );
}
