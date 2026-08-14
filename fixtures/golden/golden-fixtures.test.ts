import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const GOLDEN_DIR = dirname(fileURLToPath(import.meta.url));

describe("fixtures/golden", () => {
  const files = readdirSync(GOLDEN_DIR).filter((file) => file.endsWith(".json"));
  const readme = readFileSync(join(GOLDEN_DIR, "README.md"), "utf-8");

  it("has at least one fixture", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s is valid JSON", (file) => {
    const contents = readFileSync(join(GOLDEN_DIR, file), "utf-8");
    expect(() => JSON.parse(contents)).not.toThrow();
  });

  it.each(files)("%s is documented in README.md", (file) => {
    expect(readme).toContain(`\`${file}\``);
  });
});
