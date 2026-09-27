import { describe, expect, it } from "vitest";
import {
  logoExtensionFor,
  OpponentCreateInputSchema,
  OpponentIdSchema,
  OpponentSchema,
} from "./opponent";

function baseOpponent() {
  return {
    _id: "OPN123456",
    name: "Cleveland Comets",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
}

describe("OpponentSchema", () => {
  it("accepts an opponent without a logo", () => {
    expect(OpponentSchema.safeParse(baseOpponent()).success).toBe(true);
  });

  it("accepts an opponent with a logo whose key matches its content type", () => {
    const result = OpponentSchema.safeParse({
      ...baseOpponent(),
      logo: {
        key: "opponents/OPN123456/logo-1759000000000.svg",
        contentType: "image/svg+xml",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unsupported content type", () => {
    const result = OpponentSchema.safeParse({
      ...baseOpponent(),
      logo: { key: "opponents/OPN123456/logo-1.gif", contentType: "image/gif" },
    });
    expect(issuePaths(result)).toContain("logo.contentType");
  });

  it("rejects a key whose extension does not match the content type", () => {
    const result = OpponentSchema.safeParse({
      ...baseOpponent(),
      logo: { key: "opponents/OPN123456/logo-1.png", contentType: "image/svg+xml" },
    });
    expect(issuePaths(result)).toContain("logo.key");
  });

  it("rejects a malformed id", () => {
    const result = OpponentSchema.safeParse({ ...baseOpponent(), _id: "OPP123456" });
    expect(issuePaths(result)).toContain("_id");
  });

  it("rejects a blank name after trimming", () => {
    const result = OpponentSchema.safeParse({ ...baseOpponent(), name: "   " });
    expect(issuePaths(result)).toContain("name");
  });

  it("trims the name", () => {
    const result = OpponentSchema.parse({ ...baseOpponent(), name: "  Warbirds " });
    expect(result.name).toBe("Warbirds");
  });
});

describe("OpponentCreateInputSchema", () => {
  it("accepts a payload without _id/createdAt/updatedAt", () => {
    expect(OpponentCreateInputSchema.safeParse({ name: "Warbirds" }).success).toBe(true);
  });
});

describe("OpponentIdSchema", () => {
  it("accepts OPN followed by six digits", () => {
    expect(OpponentIdSchema.safeParse("OPN000001").success).toBe(true);
  });

  it.each(["", "OPN12345", "OPP123456", "opn123456"])("rejects %j", (value) => {
    expect(OpponentIdSchema.safeParse(value).success).toBe(false);
  });
});

describe("logoExtensionFor", () => {
  it("maps each allowed content type to its extension", () => {
    expect(logoExtensionFor("image/svg+xml")).toBe("svg");
    expect(logoExtensionFor("image/png")).toBe("png");
    expect(logoExtensionFor("image/jpeg")).toBe("jpg");
    expect(logoExtensionFor("image/webp")).toBe("webp");
  });
});
