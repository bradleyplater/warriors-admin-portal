import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCHEMAS_DIR = dirname(fileURLToPath(import.meta.url));

describe("lib/schemas module boundary", () => {
  it("does not import the MongoDB driver or lib/mongodb", () => {
    const files = readdirSync(SCHEMAS_DIR).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const contents = readFileSync(join(SCHEMAS_DIR, file), "utf-8");
      expect(contents).not.toMatch(/from ["']mongodb["']/);
      expect(contents).not.toMatch(/mongodb["']$/m);
      expect(contents.toLowerCase()).not.toContain("lib/mongodb");
    }
  });
});
