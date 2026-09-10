import React from "react";

export default function EmptyState({ title, body, action }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
