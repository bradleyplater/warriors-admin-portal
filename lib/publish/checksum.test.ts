import { describe, expect, it } from "vitest";
import { checksumContent } from "./checksum";

describe("checksumContent", () => {
  it("is deterministic for identical input", () => {
    expect(checksumContent("hello")).toBe(checksumContent("hello"));
  });

  it("differs for different input", () => {
    expect(checksumContent("hello")).not.toBe(checksumContent("world"));
  });

  it("returns a sha256 hex digest", () => {
    expect(checksumContent("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
