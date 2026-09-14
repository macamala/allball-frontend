import React from "react";

export default function EmptyState({ title, body, action, compact = false }) {
  return (
    <div className={compact ? "empty-state is-compact" : "empty-state"}>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
