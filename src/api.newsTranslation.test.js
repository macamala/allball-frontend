import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it("limits translation reads to four, deduplicates paths and refreshes missing copy", async () => {
  const waiting = [];
  const fetch = vi.fn(() => new Promise((resolve) => waiting.push(resolve)));
  vi.stubGlobal("fetch", fetch);
  const { getArticleTranslation } = await import("./api.js");
  const requests = Array.from({ length: 5 }, (_, i) => getArticleTranslation(`story-${i}`, "sr"));
  const duplicate = getArticleTranslation("story-0", "sr");
  expect(duplicate).toBe(requests[0]);
  expect(fetch).toHaveBeenCalledTimes(4);
  const reply = { ok: true, text: async () => JSON.stringify({ available: false, status: "missing" }) };
  waiting.shift()(reply);
  await requests[0];
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));
  waiting.splice(0).forEach((resolve) => resolve(reply));
  await Promise.all(requests);
  await getArticleTranslation("story-0", "sr");
  expect(fetch).toHaveBeenCalledTimes(5);
  const refresh = getArticleTranslation("story-0", "sr", { refresh: true });
  expect(fetch).toHaveBeenCalledTimes(6);
  waiting.shift()({ ok: true, text: async () => JSON.stringify({ available: true, title: "Prevod" }) });
  expect((await refresh).title).toBe("Prevod");
});
