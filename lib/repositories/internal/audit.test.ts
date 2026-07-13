import { describe, expect, it } from "vitest";
import { stampCreate, stampUpdate } from "./audit";

describe("stampCreate", () => {
  it("sets createdAt and updatedAt to the same current time", () => {
    const before = new Date();
    const stamp = stampCreate();
    const after = new Date();

    expect(stamp.createdAt.getTime()).toBe(stamp.updatedAt.getTime());
    expect(stamp.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(stamp.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe("stampUpdate", () => {
  it("sets only updatedAt", () => {
    const stamp = stampUpdate();
    expect(Object.keys(stamp)).toEqual(["updatedAt"]);
    expect(stamp.updatedAt).toBeInstanceOf(Date);
  });
});
