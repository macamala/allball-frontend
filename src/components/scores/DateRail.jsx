import React, { useRef } from "react";
import { addLocalDays } from "../../lib/sportsData.js";

export default function DateRail({ date, today, onChange, t }) {
  const inputRef = useRef(null);
  const chips = [
    { id: addLocalDays(today, -1), label: t("live.yesterday") },
    { id: today, label: t("live.today") },
    { id: addLocalDays(today, 1), label: t("live.tomorrow") },
  ];

  return (
    <div className="date-rail">
      <button
        type="button"
        className="date-rail-step"
        aria-label={t("previous")}
        onClick={() => onChange(addLocalDays(date, -1))}
      >
        ‹
      </button>
      {chips.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === date ? "date-chip is-active" : "date-chip"}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
      <button
        type="button"
        className="date-rail-step"
        aria-label={t("next")}
        onClick={() => onChange(addLocalDays(date, 1))}
      >
        ›
      </button>
      <button
        type="button"
        className="date-cal"
        aria-label={t("live.date")}
        onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.click()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 3v4M16 3v4M3 10h18" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <input
          ref={inputRef}
          type="date"
          value={date}
          onChange={(event) => onChange(event.target.value)}
        />
      </button>
    </div>
  );
}
