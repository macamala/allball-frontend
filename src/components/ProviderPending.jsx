import React from "react";
import EmptyState from "./EmptyState.jsx";

export default function ProviderPending({
  title = "Live data coming soon",
  body = "This section will fill in when a live sports-data provider is connected. No placeholder scores or tables are shown.",
}) {
  return (
    <div className="provider-pending">
      <EmptyState title={title} body={body} />
    </div>
  );
}
