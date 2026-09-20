import React, { useRef } from "react";
import { addLocalDays } from "../../lib/sportsData.js";

function stripLabel(dateKey, today, locale) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  if (dateKey === today) return "TODAY";
  const weekday = date.toLocaleDateString(locale, { weekday: "short" }).toUpperCase();
  return `${weekday} ${date.getDate()}`;
}

export default function DateRail({ date, today, onChange, t, locale = "en-GB" }) {
  const inputRef = useRef(null);
  const chips = [
    { id: addLocalDays(today, -1), label: t("live.yesterday") },
    { id: today, label: t("live.today") },
    { id: addLocalDays(today, 1), label: t("live.tomorrow") },
  ];
  const strip = [-2, -1, 0, 1, 2].map((offset) => addLocalDays(date, offset));

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
      <div className="date-strip" aria-hidden="false">
        {strip.map((id) => (
          <button
            key={id}
            type="button"
            className={id === date ? `date-chip is-strip ${id === today ? "is-today is-active" : "is-active"}` : `date-chip is-strip ${id === today ? "is-today" : ""}`}
            onClick={() => onChange(id)}
          >
            {stripLabel(id, today, locale)}
          </button>
        ))}
      </div>
      <div className="date-chips">
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
      </div>
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
