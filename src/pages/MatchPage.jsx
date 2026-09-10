import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMatch } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import ProviderPending from "../components/ProviderPending.jsx";

export default function MatchPage() {
  const { matchId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    setPageSeo({
      title: "Match | NinkoSports",
      description: "Match center will appear when live sports data is connected.",
      path: `/match/${matchId}`,
    });
    getMatch(matchId).then(setData).catch(() => setData({ connected: false }));
  }, [matchId]);

  return (
    <div className="page-match">
      <h1>Match center</h1>
      <p className="lede">
        Prepared for score header, status, timeline, lineups, statistics and
        head-to-head once a provider is connected.
      </p>
      <div className="match-grid">
        {["Score header", "Timeline", "Lineups", "Statistics", "H2H", "League context"].map(
          (section) => (
            <section key={section} className="panel">
              <h2>{section}</h2>
              <ProviderPending
                title={`${section} unavailable`}
                body={data?.message || "No live match data in this phase."}
              />
            </section>
          )
        )}
      </div>
    </div>
  );
}
