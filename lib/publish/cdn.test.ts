import { describe, expect, it } from "vitest";
import { invalidateCdn } from "./cdn";

// No local CloudFront-compatible emulator exists (unlike MinIO for S3), so
// these only assert the no-op branches: a real network attempt against
// CloudFront would fail or hang in the test environment, which is how the
// short-circuit is proven without mocking AWS.
describe("invalidateCdn", () => {
  it("does nothing when no distribution id is configured", async () => {
    await expect(invalidateCdn(undefined, ["/players.json"])).resolves.toBeUndefined();
  });

  it("does nothing when there are no changed paths", async () => {
    await expect(invalidateCdn("SOME_DISTRIBUTION_ID", [])).resolves.toBeUndefined();
  });
});
