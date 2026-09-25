import React, { useEffect, useRef } from "react";

// Reveal the active tab by scrolling this rail only, never the document.
export function revealActiveTab(rail) {
  const active = rail?.querySelector('[aria-selected="true"]');
  if (!active) return;
  const bounds = rail.getBoundingClientRect();
  const target = active.getBoundingClientRect();
  if (!bounds.width || !target.width) return;
  if (target.left < bounds.left + 4) rail.scrollLeft += target.left - bounds.left - 4;
  else if (target.right > bounds.right - 4) rail.scrollLeft += target.right - bounds.right + 4;
}

export default function MatchSectionTabs({ sections, currentSection, onSelect, label }) {
  const railRef = useRef(null);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const reveal = () => revealActiveTab(rail);
    reveal();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reveal) : null;
    observer?.observe(rail);
    window.addEventListener("resize", reveal);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", reveal);
    };
  }, [currentSection, sections]);

  function onKeyDown(event, index) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = event.key === "ArrowRight" ? (index + 1) % sections.length
      : event.key === "ArrowLeft" ? (index - 1 + sections.length) % sections.length
        : event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    onSelect(sections[next].id);
    railRef.current?.querySelectorAll('[role="tab"]')[next]?.focus({ preventScroll: true });
  }

  return (
    <div className="mc-tabs" ref={railRef} role="tablist" aria-label={label}>
      {sections.map((item, index) => {
        const selected = currentSection === item.id;
        return <button key={item.id} id={`mc-tab-${item.id}`} className={`mc-tab ${selected ? "is-active" : ""}`}
          type="button" role="tab" aria-selected={selected} aria-controls={`mc-panel-${item.id}`}
          tabIndex={selected ? 0 : -1} onClick={() => onSelect(item.id)} onKeyDown={event => onKeyDown(event, index)}>
          {item.label}
        </button>;
      })}
    </div>
  );
}
