import React, { useEffect, useRef, useState } from "react";

export default function SportRail({ items, value, onChange, ariaLabel }) {
  const scroller = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

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

  function scrollBy(dir) {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({ left: dir * Math.max(180, node.clientWidth * 0.45), behavior: "smooth" });
  }

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
          </button>
        ))}
      </div>
      {canRight ? (
        <button type="button" className="sport-rail-arrow is-right" onClick={() => scrollBy(1)} aria-label="More sports">
          ›
        </button>
      ) : null}
    </div>
  );
}
