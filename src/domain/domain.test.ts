import { describe, expect, it } from "vitest";
import type { FishingSpot } from "../types/fishing";
import { classifyArrival, isSpotActive, mergeSpots, pruneExpired, SeenRegistry, spotFreshness } from "./spots";
import { approximateLocation, distanceMeters, isValidCoordinate } from "./location";
import { normalizeInput, validateSpotInput, GUEST_NAME } from "./validation";
import { formatAgo } from "./time";
import { createId } from "./id";

const NOW = Date.parse("2026-10-16T12:00:00Z");
const min = 60_000;

function spot(id: string, createdOffsetMin: number, ttlMin = 30): FishingSpot {
  const created = NOW + createdOffsetMin * min;
  return {
    id,
    latitude: 39.1,
    longitude: -120.0,
    username: "Alex",
    fishType: "Bass",
    activityLevel: "high",
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(created + ttlMin * min).toISOString(),
  };
}

describe("expiry", () => {
  it("is active until expiresAt, inactive at/after it", () => {
    const s = spot("a", -29);
    expect(isSpotActive(s, NOW)).toBe(true);
    expect(isSpotActive(s, NOW + 1 * min)).toBe(false);
    expect(isSpotActive(s, NOW + 2 * min)).toBe(false);
  });

  it("treats unparsable expiry as inactive", () => {
    expect(isSpotActive({ ...spot("a", 0), expiresAt: "nope" }, NOW)).toBe(false);
  });

  it("freshness decays from 1 to 0", () => {
    expect(spotFreshness(spot("a", 0), NOW)).toBeCloseTo(1);
    expect(spotFreshness(spot("a", -15), NOW)).toBeCloseTo(0.5);
    expect(spotFreshness(spot("a", -40), NOW)).toBe(0);
  });

  it("pruneExpired keeps identity when nothing expired", () => {
    const list = [spot("a", -1), spot("b", -2)];
    expect(pruneExpired(list, NOW)).toBe(list);
    expect(pruneExpired([...list, spot("c", -31)], NOW)).toHaveLength(2);
  });
});

describe("mergeSpots / dedup", () => {
  it("dedupes by id, drops expired, sorts newest first", () => {
    const current = [spot("a", -10)];
    const merged = mergeSpots(current, [spot("a", -10), spot("b", -1), spot("old", -45)], NOW);
    expect(merged.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("keeps the existing instance on duplicate delivery", () => {
    const a = spot("a", -5);
    const merged = mergeSpots([a], [{ ...a, username: "Imposter" }], NOW);
    expect(merged[0]).toBe(a);
  });

  it("SeenRegistry only reports an id once", () => {
    const r = new SeenRegistry();
    expect(r.markIfNew("x")).toBe(true);
    expect(r.markIfNew("x")).toBe(false);
    expect(r.has("x")).toBe(true);
  });
});

describe("classifyArrival", () => {
  it("initial load is always quiet-initial", () => {
    expect(classifyArrival(spot("a", 0), { source: "initial", isOwn: false, now: NOW })).toBe("initial");
  });
  it("own reports celebrate even when they arrive via realtime first", () => {
    expect(classifyArrival(spot("a", 0), { source: "realtime", isOwn: true, now: NOW })).toBe("own");
  });
  it("fresh remote reports are discoveries, stale backfills are quiet", () => {
    expect(classifyArrival(spot("a", -1), { source: "realtime", isOwn: false, now: NOW })).toBe("discovery");
    expect(classifyArrival(spot("a", -10), { source: "backfill", isOwn: false, now: NOW })).toBe("quiet");
  });
});

describe("location privacy", () => {
  it("approximate snapping is deterministic and within the grid", () => {
    const p = { lat: 39.091234, lng: -120.041234 };
    const a = approximateLocation(p);
    expect(approximateLocation({ lat: p.lat + 0.0001, lng: p.lng + 0.0001 })).toEqual(a);
    expect(distanceMeters(p, a)).toBeLessThan(300);
    expect(a).not.toEqual(p);
  });

  it("validates coordinate ranges", () => {
    expect(isValidCoordinate(39, -120)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, -181)).toBe(false);
    expect(isValidCoordinate(NaN, 0)).toBe(false);
  });
});

describe("validation", () => {
  const base = { latitude: 39, longitude: -120, username: "Alex", fishType: "Bass", activityLevel: "high" as const };
  it("accepts a minimal valid report", () => {
    expect(validateSpotInput(base)).toEqual({});
  });
  it("requires species and a valid level", () => {
    const e = validateSpotInput({ ...base, fishType: " ", activityLevel: "insane" as never });
    expect(e.fishType).toBeDefined();
    expect(e.activityLevel).toBeDefined();
  });
  it("limits note length", () => {
    expect(validateSpotInput({ ...base, note: "x".repeat(141) }).note).toBeDefined();
  });
  it("normalizes whitespace and falls back to a guest name", () => {
    const n = normalizeInput({ ...base, username: "  ", note: "  big   ones  " });
    expect(n.username).toBe(GUEST_NAME);
    expect(n.note).toBe("big ones");
    expect(normalizeInput({ ...base, note: "   " }).note).toBeUndefined();
  });
});

describe("misc", () => {
  it("formats ages", () => {
    expect(formatAgo(new Date(NOW - 10_000).toISOString(), NOW)).toBe("just now");
    expect(formatAgo(new Date(NOW - 5 * min).toISOString(), NOW)).toBe("5 min ago");
  });
  it("creates v4 uuids", () => {
    expect(createId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
