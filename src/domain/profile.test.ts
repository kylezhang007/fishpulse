import { describe, expect, it } from "vitest";
import { colorForName, daysSince, initials, validateDisplayName, AVATAR_COLORS } from "./profile";

describe("profile helpers", () => {
  it("builds initials", () => {
    expect(initials("Alex")).toBe("A");
    expect(initials("maya chen")).toBe("MC");
    expect(initials("Guest-4821")).toBe("G");
    expect(initials("  ")).toBe("?");
  });
  it("gives a stable palette colour per name (case-insensitive)", () => {
    expect(colorForName("Alex")).toBe(colorForName("alex "));
    expect(AVATAR_COLORS).toContain(colorForName("Jordan"));
  });
  it("validates display names", () => {
    expect(validateDisplayName("A")).toMatch(/At least/);
    expect(validateDisplayName("x".repeat(21))).toMatch(/At most/);
    expect(validateDisplayName("Guest-12")).toMatch(/reserved/);
    expect(validateDisplayName(" Alex ")).toBeNull();
  });
  it("counts community days from 1", () => {
    const now = Date.parse("2026-10-17T12:00:00Z");
    expect(daysSince("2026-10-17T08:00:00Z", now)).toBe(1);
    expect(daysSince("2026-10-15T08:00:00Z", now)).toBe(3);
  });
});
