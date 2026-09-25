import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MatchSectionTabs, { revealActiveTab } from "./MatchSectionTabs.jsx";
const sections = [{ id: "overview", label: "Overview" }, { id: "stats", label: "Statistics" }, { id: "standings", label: "Standings" }];
function Harness() {
  const [current, setCurrent] = useState("overview");
  return <MatchSectionTabs sections={sections} currentSection={current} onSelect={setCurrent} label="Match center" />;
}
describe("Match section tab navigation", () => {
  it("supports keyboard navigation, wraps and maintains the selected tab stop", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Standings" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Standings" }));
    fireEvent.keyDown(document.activeElement, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Overview" }).tabIndex).toBe(0);
    fireEvent.keyDown(document.activeElement, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Standings" }).tabIndex).toBe(0);
    fireEvent.keyDown(document.activeElement, { key: "Home" });
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("true");
  });
  it("reveals an off-screen active tab by scrolling only its rail", () => {
    const tab = { getBoundingClientRect: () => ({ left: 700, right: 800, width: 100 }), scrollIntoView: vi.fn() };
    const rail = { scrollLeft: 0, getBoundingClientRect: () => ({ left: 12, right: 378, width: 366 }), querySelector: () => tab };
    revealActiveTab(rail);
    expect(rail.scrollLeft).toBe(426);
    expect(tab.scrollIntoView).not.toHaveBeenCalled();
  });
  it("reveals a tab to the left without scrolling a tab already in view", () => {
    const tab = { getBoundingClientRect: () => ({ left: -20, right: 70, width: 90 }) };
    const rail = { scrollLeft: 150, getBoundingClientRect: () => ({ left: 12, right: 378, width: 366 }), querySelector: () => tab };
    revealActiveTab(rail);
    expect(rail.scrollLeft).toBe(114);
    tab.getBoundingClientRect = () => ({ left: 50, right: 150, width: 100 });
    revealActiveTab(rail);
    expect(rail.scrollLeft).toBe(114);
  });
  it("keeps clicks and aria panel associations intact", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("tab", { name: "Standings" }));
    expect(screen.getByRole("tab", { name: "Standings" }).getAttribute("aria-controls")).toBe("mc-panel-standings");
    expect(screen.getAllByRole("tab").filter(tab => tab.tabIndex === 0)).toHaveLength(1);
  });
});
