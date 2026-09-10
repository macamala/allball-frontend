import React, { useEffect, useState } from "react";
import { getScores } from "../api.js";
import { setPageSeo } from "../lib/seo.js";
import ProviderPending from "../components/ProviderPending.jsx";

const VIEWS = ["Live", "Today", "Tomorrow"];

export default function LiveScoresPage() {
  const [view, setView] = useState("Live");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setPageSeo({
      title: "Live Scores | NinkoSports",
      description:
        "Live scores, fixtures and results will appear here when a sports-data provider is connected.",
      path: "/live-scores",
    });
    getScores().then(setStatus).catch(() => setStatus({ connected: false }));
  }, []);

  return (
    <div className="page-scores">
      <h1>Live Scores</h1>
      <div className="score-toolbar">
        {VIEWS.map((item) => (
          <button
            key={item}
            type="button"
            className={item === view ? "tab is-active" : "tab"}
            onClick={() => setView(item)}
          >
            {item}
          </button>
        ))}
        <label className="date-field">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      </div>
      <ProviderPending
        title="Scores center is ready"
        body={
          status?.message ||
          "Match lists, kickoff times and live scores will appear here after a sports-data provider is connected. No placeholder games are shown."
        }
      />
    </div>
  );
}
