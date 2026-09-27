import { describe, expect, it } from "vitest";
import { buildLogoKey, MAX_LOGO_BYTES, validateLogoFile } from "./opponent-logos";

describe("validateLogoFile", () => {
  it.each([
    ["image/svg+xml"],
    ["image/png"],
    ["image/jpeg"],
    ["image/webp"],
  ])("accepts %s", (type) => {
    expect(validateLogoFile({ type, size: 1024 })).toEqual({
      ok: true,
      contentType: type,
    });
  });

  it.each([["image/gif"], ["application/pdf"], [""]])("rejects %j", (type) => {
    expect(validateLogoFile({ type, size: 1024 }).ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES }).ok).toBe(true);
  });

  it("accepts a few-MB file", () => {
    expect(validateLogoFile({ type: "image/png", size: 3 * 1024 * 1024 }).ok).toBe(true);
  });

  it("rejects a file over 5 MB", () => {
    expect(validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES + 1 })).toEqual({
      ok: false,
      error: "Logo must be 5 MB or smaller",
    });
  });

  it("rejects an empty file", () => {
    expect(validateLogoFile({ type: "image/png", size: 0 }).ok).toBe(false);
  });
});

describe("buildLogoKey", () => {
  it("puts the logo under the opponent's folder with a timestamped name and the content type's extension", () => {
    const now = new Date(1759000000000);
    expect(buildLogoKey("OPN123456", "image/svg+xml", now)).toBe(
      "opponents/OPN123456/logo-1759000000000.svg",
    );
    expect(buildLogoKey("OPN123456", "image/jpeg", now)).toBe(
      "opponents/OPN123456/logo-1759000000000.jpg",
    );
  });
});
