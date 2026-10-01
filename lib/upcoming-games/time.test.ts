import { describe, expect, it } from "vitest";
import { formatTime12h, todayInLondon } from "./time";

describe("todayInLondon", () => {
  it("uses the UK date during BST, an hour ahead of UTC", () => {
    // 23:30 UTC on 30 Sep is 00:30 BST on 1 Oct.
    expect(todayInLondon(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
  });

  it("matches UTC during GMT", () => {
    expect(todayInLondon(new Date("2026-12-31T23:30:00Z"))).toBe("2026-12-31");
    expect(todayInLondon(new Date("2027-01-01T00:30:00Z"))).toBe("2027-01-01");
  });
});

describe("formatTime12h", () => {
  it.each([
    ["20:30", "8:30 PM"],
    ["19:00", "7:00 PM"],
    ["16:00", "4:00 PM"],
    ["12:00", "12:00 PM"],
    ["00:15", "12:15 AM"],
    ["09:05", "9:05 AM"],
  ])("formats %s as %s", (time, expected) => {
    expect(formatTime12h(time)).toBe(expected);
  });
});
