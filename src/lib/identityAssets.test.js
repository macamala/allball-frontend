import { describe, expect, it } from "vitest";
import { flagEmoji } from "./identityAssets.js";

describe("identityAssets country flags", () => {
  it("renders ISO-2 country codes", () => {
    expect(flagEmoji("RS")).toBe("🇷🇸");
    expect(flagEmoji("AU")).toBe("🇦🇺");
  });

  it("renders common sports ISO-3 country codes", () => {
    expect(flagEmoji("SRB")).toBe("🇷🇸");
    expect(flagEmoji("CRO")).toBe("🇭🇷");
    expect(flagEmoji("AUS")).toBe("🇦🇺");
    expect(flagEmoji("USA")).toBe("🇺🇸");
    expect(flagEmoji("UZB")).toBe("🇺🇿");
  });

  it("renders country slugs and names", () => {
    expect(flagEmoji("serbia")).toBe("🇷🇸");
    expect(flagEmoji("south-korea")).toBe("🇰🇷");
  });
});
