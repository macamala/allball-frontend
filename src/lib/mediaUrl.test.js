import { describe, expect, it } from "vitest";
import { imageUrlForDisplay, widthFromUrl } from "./mediaUrl.js";

const BBC_240 =
  "https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/live/photo.jpg";

describe("imageUrlForDisplay", () => {
  it("does not render a 240px variant into a large featured card", () => {
    const featured = imageUrlForDisplay(BBC_240, "featured");
    expect(featured).toContain("/1280/");
    expect(featured).not.toContain("/240/");
    expect(widthFromUrl(BBC_240)).toBe(240);
    expect(widthFromUrl(featured)).toBe(1280);
  });

  it("does not request 1600px images for tiny cards", () => {
    const thumb = imageUrlForDisplay(BBC_240, "thumb");
    expect(thumb).toContain("/320/");
    expect(thumb).not.toContain("/1600/");
    const huge =
      "https://ichef.bbci.co.uk/ace/standard/1920/cpsprodpb/live/photo.jpg";
    expect(imageUrlForDisplay(huge, "thumb")).toContain("/320/");
    expect(imageUrlForDisplay(huge, "thumb")).not.toContain("/1600/");
  });

  it("leaves full-size URLs without width tokens unchanged", () => {
    const full = "https://cdn.example.com/wp-content/uploads/2026/09/goal.jpg";
    expect(imageUrlForDisplay(full, "featured")).toBe(full);
    expect(imageUrlForDisplay(full, "thumb")).toBe(full);
    expect(imageUrlForDisplay(full, "hero")).toBe(full);
  });
});
