import React from "react";
import ProviderPending from "../components/ProviderPending.jsx";

/**
 * Team page foundation — not registered in public navigation.
 *
 * Backend support still needed before this can be a live route:
 * - teams table: slug, name, sport, league, logo_url, provider_id
 * - article tagging by team slug
 * - fixtures/results/standings from a sports-data provider
 *
 * Do not fabricate logos, scores, or table positions.
 */
export default function TeamPage({ slug }) {
  return (
    <div className="page-team">
      <h1>Team page</h1>
      <p className="lede">
        Prepared for {slug || "a team"}: identity, recent news, fixtures,
        results and standings. Hidden from public navigation until team entities
        exist.
      </p>
      <ProviderPending title="Team data is not in the database yet" />
    </div>
  );
}
