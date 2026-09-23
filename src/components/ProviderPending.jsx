import React from "react";
import EmptyState from "./EmptyState.jsx";

export default function ProviderPending({
  title = "Live data coming soon",
  body = "Live data is not available for this section yet. No placeholder scores or tables are shown.",
}) {
  return (
    <div className="provider-pending">
      <EmptyState title={title} body={body} />
    </div>
  );
}
