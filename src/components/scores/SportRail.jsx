import React, { useEffect, useRef, useState } from "react";

export default function SportRail({ items, value, onChange, ariaLabel, otherItems = [] }) {
  const scroller = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);

  function updateFades() {
    const node = scroller.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth - 4;
    setCanLeft(node.scrollLeft > 4);
    setCanRight(max > 4 && node.scrollLeft < max);
  }

  useEffect(() => {
    updateFades();
    const node = scroller.current;
    if (!node) return undefined;
    node.addEventListener("scroll", updateFades, { passive: true });
    window.addEventListener("resize", updateFades);
    return () => {
      node.removeEventListener("scroll", updateFades);
      window.removeEventListener("resize", updateFades);
    };
  }, [items]);

  useEffect(() => {
    const active = scroller.current?.querySelector(".sport-chip.is-active");
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [value]);

  function scrollBy(dir) {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({ left: dir * Math.max(180, node.clientWidth * 0.45), behavior: "smooth" });
  }

  const otherActive = otherItems.some((item) => item.id === value);

  return (
    <div className={`sport-rail ${canLeft ? "has-left" : ""} ${canRight ? "has-right" : ""}`}>
      {canLeft ? (
        <button type="button" className="sport-rail-arrow is-left" onClick={() => scrollBy(-1)} aria-label="Previous sports">
          ‹
        </button>
      ) : null}
      <div className="sport-rail-scroll" ref={scroller} aria-label={ariaLabel}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === value}
            aria-label={item.label}
            className={item.id === value ? "sport-chip is-active" : "sport-chip"}
            onClick={() => onChange(item.id)}
          >
            {item.icon ? <span className="sport-chip-icon" aria-hidden="true">{item.icon}</span> : null}
            <span>{item.label}</span>
            {item.count > 0 ? <span className="sport-chip-count" aria-hidden="true">{item.count}</span> : null}
          </button>
        ))}
        {otherItems.length ? (
          <div className="sport-other">
            <button
              type="button"
              className={otherActive ? "sport-chip is-active" : "sport-chip"}
              aria-haspopup="listbox"
              aria-expanded={otherOpen}
              aria-label={otherItems.find((item) => item.id === value)?.label || "Other"}
              onClick={() => setOtherOpen((open) => !open)}
            >
              <span>{otherItems.find((item) => item.id === value)?.label || "Other"}</span>
              {otherActive && otherItems.find((item) => item.id === value)?.count > 0 ? (
                <span className="sport-chip-count" aria-hidden="true">
                  {otherItems.find((item) => item.id === value).count}
                </span>
              ) : null}
            </button>
            {otherOpen ? (
              <div className="sport-other-menu" role="listbox">
                {otherItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.id === value}
                    className={item.id === value ? "is-active" : ""}
                    onClick={() => {
                      onChange(item.id);
                      setOtherOpen(false);
                    }}
                  >
                    {item.label}
                    {item.count > 0 ? <span>{item.count}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {canRight ? (
        <button type="button" className="sport-rail-arrow is-right" onClick={() => scrollBy(1)} aria-label="More sports">
          ›
        </button>
      ) : null}
    </div>
  );
}
