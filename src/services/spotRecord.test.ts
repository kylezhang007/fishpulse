import { describe, expect, it } from "vitest";
import { inputToInsert, rowToSpot } from "./spotRecord";

describe("row ↔ model mapping", () => {
  const row = {
    id: "1f0c",
    latitude: "39.1", // numeric columns can arrive as strings
    longitude: -120.04,
    username: "Alex",
    fish_type: "Bass",
    activity_level: "high",
    note: null,
    is_approximate: true,
    created_at: "2026-10-16T12:00:00+00:00",
    expires_at: "2026-10-16T12:30:00+00:00",
    creator_id: "secret-user-uuid",
  };

  it("maps snake_case rows to the domain model", () => {
    expect(rowToSpot(row)).toEqual({
      id: "1f0c",
      latitude: 39.1,
      longitude: -120.04,
      username: "Alex",
      fishType: "Bass",
      activityLevel: "high",
      note: undefined,
      createdAt: "2026-10-16T12:00:00.000Z",
      expiresAt: "2026-10-16T12:30:00.000Z",
      isApproximate: true,
      creatorId: "secret-user-uuid",
    });
  });

  it("links to the reporter profile via creatorId", () => {
    expect(rowToSpot(row)?.creatorId).toBe("secret-user-uuid");
    expect(rowToSpot({ ...row, creator_id: undefined })?.creatorId).toBeUndefined();
  });

  it("rejects malformed rows", () => {
    expect(rowToSpot(null)).toBeNull();
    expect(rowToSpot({ ...row, latitude: "abc" })).toBeNull();
    expect(rowToSpot({ ...row, activity_level: "extreme" })).toBeNull();
  });

  it("builds insert payloads without server-owned fields", () => {
    const now = Date.parse("2026-10-16T12:00:00Z");
    const insert = inputToInsert(
      { id: "x", latitude: 1, longitude: 2, username: "A", fishType: "Trout", activityLevel: "low" },
      30,
      now,
    );
    expect(insert).toMatchObject({ fish_type: "Trout", activity_level: "low", note: null, is_approximate: false });
    expect(insert.expires_at).toBe("2026-10-16T12:30:00.000Z");
    expect(insert).not.toHaveProperty("created_at");
    expect(insert).not.toHaveProperty("creator_id");
  });
});
