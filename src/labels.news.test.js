import {expect, it} from "vitest";
import {articleDate} from "./labels.js";

it("formats News UTC timestamps identically with or without the API timezone suffix", () => {
  const naive = articleDate({published_at: "2026-09-28T23:58:37"});
  const aware = articleDate({published_at: "2026-09-28T23:58:37Z"});
  expect(naive).toBe(aware);
  expect(articleDate({published_at: "2026-09-28T23:58:37.123456"})).toBe(aware);
  expect(articleDate({published_at: "bad timestamp"})).toBe("");
});
