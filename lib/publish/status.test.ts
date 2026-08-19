import { describe, expect, it } from "vitest";
import { hasUnpublishedChangesSince } from "./status";

describe("hasUnpublishedChangesSince", () => {
  it("is false when no data exists yet, even with no prior publish", () => {
    expect(hasUnpublishedChangesSince(null, undefined)).toBe(false);
  });

  it("is true when data exists but nothing has ever been published", () => {
    expect(hasUnpublishedChangesSince(new Date("2026-01-01"), undefined)).toBe(true);
  });

  it("is true when data changed after the last successful publish", () => {
    const lastPublish = new Date("2026-01-01T00:00:00Z");
    const latestUpdate = new Date("2026-01-02T00:00:00Z");
    expect(hasUnpublishedChangesSince(latestUpdate, lastPublish)).toBe(true);
  });

  it("is false when data last changed before the last successful publish", () => {
    const lastPublish = new Date("2026-01-02T00:00:00Z");
    const latestUpdate = new Date("2026-01-01T00:00:00Z");
    expect(hasUnpublishedChangesSince(latestUpdate, lastPublish)).toBe(false);
  });

  it("is false when data last changed exactly at the last successful publish", () => {
    const at = new Date("2026-01-01T00:00:00Z");
    expect(hasUnpublishedChangesSince(at, at)).toBe(false);
  });
});
