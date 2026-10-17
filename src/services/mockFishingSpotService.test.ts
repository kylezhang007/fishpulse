import { describe, expect, it } from "vitest";
import { MockFishingSpotService } from "./mockFishingSpotService";
import type { FishingSpot } from "../types/fishing";

describe("MockFishingSpotService (Demo Mode adapter)", () => {
  const make = () => new MockFishingSpotService({ center: { lat: 39.09, lng: -120.04 }, ttlMinutes: 30 });

  it("seeds active, clearly-labelled sample reports", async () => {
    const svc = make();
    await svc.init();
    const spots = await svc.getSpots();
    expect(spots.length).toBeGreaterThanOrEqual(8);
    expect(spots.every((s) => s.isSample)).toBe(true);
    expect(new Set(spots.map((s) => s.activityLevel)).size).toBe(3);
    expect(spots.every((s) => Date.parse(s.expiresAt) > Date.now())).toBe(true);
  });

  it("creates reports with server-style timestamps and the configured TTL", async () => {
    const svc = make();
    await svc.init();
    await svc.registerMember("ANY-CODE", "Tester", "#3fb2ff");
    const spot = await svc.createSpot({
      id: "11111111-1111-4111-8111-111111111111",
      latitude: 39.1,
      longitude: -120,
      username: "Alex",
      fishType: "Bass",
      activityLevel: "high",
    });
    expect(Date.parse(spot.expiresAt) - Date.parse(spot.createdAt)).toBe(30 * 60_000);
    expect(spot.isSample).toBeUndefined();
    expect((await svc.getSpots()).some((s) => s.id === spot.id)).toBe(true);
  });

  it("rejects invalid input at the adapter boundary", async () => {
    const svc = make();
    await svc.init();
    await svc.registerMember("ANY-CODE", "Tester", "#3fb2ff");
    await expect(
      svc.createSpot({ id: "x", latitude: 200, longitude: 0, username: "A", fishType: "Bass", activityLevel: "high" }),
    ).rejects.toThrow();
  });

  it("delivers simulated sightings through the subscription path exactly once", async () => {
    const svc = make();
    await svc.init();
    const received: FishingSpot[] = [];
    const statuses: string[] = [];
    const unsub = svc.subscribeToSpots((s) => received.push(s), (st) => statuses.push(st));
    const sim = await svc.simulateSighting();
    expect(received.map((s) => s.id)).toEqual([sim.id]);
    expect(sim.isSample).toBe(true);
    expect(statuses).toContain("live");
    unsub();
    await svc.simulateSighting();
    expect(received).toHaveLength(1);
  });
});

describe("Demo profiles", () => {
  const make = () => new MockFishingSpotService({ center: { lat: 39.09, lng: -120.04 }, ttlMinutes: 30 });

  it("guests cannot share spots; members can", async () => {
    const svc = make();
    await svc.init();
    const guest = await svc.registerGuest("#9aa6bb");
    expect(guest.role).toBe("guest");
    expect(guest.displayName).toMatch(/^Guest-\d{4}$/);
    const input = { id: "22222222-2222-4222-8222-222222222222", latitude: 39.1, longitude: -120, username: "x", fishType: "Bass", activityLevel: "high" as const };
    await expect(svc.createSpot(input)).rejects.toThrow(/members/i);
    const member = await svc.registerMember("ANY-CODE", "Rowena", "#ff6b81");
    expect(member).toMatchObject({ role: "member", displayName: "Rowena", id: guest.id });
    const spot = await svc.createSpot(input);
    expect(spot.creatorId).toBe(member.id);
  });

  it("rejects names that are already taken", async () => {
    const svc = make();
    await svc.init();
    await expect(svc.registerMember("ANY-CODE", "maya", "#ff6b81")).rejects.toMatchObject({ code: "name_taken" });
  });

  it("seeded spots link to public profiles", async () => {
    const svc = make();
    await svc.init();
    const spots = await svc.getSpots();
    const ids = [...new Set(spots.map((s) => s.creatorId!))];
    const profiles = await svc.getProfiles(ids);
    expect(profiles.length).toBe(ids.length);
  });
});
