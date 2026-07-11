import { describe, expect, it } from "vitest";
import { PublishesCreateInputSchema, PublishesSchema } from "./publish";

const validPublish = {
  _id: "PUB000001",
  startedAt: new Date("2026-01-01T00:00:00Z"),
  completedAt: new Date("2026-01-01T00:05:00Z"),
  artifacts: [{ path: "players.json", checksum: "abc123", changed: true }],
  status: "success",
};

describe("PublishesSchema", () => {
  it("accepts a valid success record", () => {
    expect(PublishesSchema.safeParse(validPublish).success).toBe(true);
  });

  it("accepts a failed record with an error message", () => {
    const result = PublishesSchema.safeParse({
      ...validPublish,
      status: "failed",
      error: "S3 upload timed out",
    });
    expect(result.success).toBe(true);
  });
});

describe("PublishesCreateInputSchema", () => {
  it("accepts a payload without _id", () => {
    const input = {
      startedAt: new Date("2026-01-01T00:00:00Z"),
      completedAt: new Date("2026-01-01T00:05:00Z"),
      artifacts: [{ path: "players.json", checksum: "abc123", changed: true }],
      status: "success",
    };
    expect(PublishesCreateInputSchema.safeParse(input).success).toBe(true);
  });
});
