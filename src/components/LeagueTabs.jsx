import React from "react";

export default function LeagueTabs({ tabs, active, onChange }) {
  return (
    <div className="league-tabs" role="tablist" aria-label="League sections">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? "tab is-active" : "tab"}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
