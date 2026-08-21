import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// getS3Client() caches its client in a module-level singleton, so each test
// needs a fresh module instance (vi.resetModules() + re-import) to observe
// a clean construction for its own env vars.
describe("getS3Client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AWS_REGION;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  async function constructAndCaptureLog() {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { getS3Client } = await import("./s3");
    getS3Client();
    return JSON.parse(logSpy.mock.calls[0]![1] as string) as {
      region: string;
      endpoint: string;
      forcePathStyle: boolean;
      accessKeyId: string;
      secretAccessKeyLength: number;
    };
  }

  it("treats a blank S3_ENDPOINT the same as unset — no custom endpoint, no path-style", async () => {
    // A lower-priority env file's real value was previously "won" against
    // this being explicitly blanked out by a higher-priority file, which
    // silently pointed prod at local MinIO — this is the regression guard.
    process.env.S3_ENDPOINT = "";

    const logged = await constructAndCaptureLog();

    expect(logged.endpoint).toBe("(default AWS endpoint)");
    expect(logged.forcePathStyle).toBe(false);
  });

  it("uses a configured endpoint and enables path-style addressing", async () => {
    process.env.S3_ENDPOINT = "http://localhost:9000";

    const logged = await constructAndCaptureLog();

    expect(logged.endpoint).toBe("http://localhost:9000");
    expect(logged.forcePathStyle).toBe(true);
  });

  it("masks a real access key id, showing only the first and last 4 characters", async () => {
    process.env.S3_ACCESS_KEY_ID = "AKIAY272OKYG26DSSMRF";
    process.env.S3_SECRET_ACCESS_KEY = "supersecretvalue";

    const logged = await constructAndCaptureLog();

    expect(logged.accessKeyId).toBe("AKIA...SMRF");
    expect(logged.secretAccessKeyLength).toBe("supersecretvalue".length);
  });

  it("masks a short access key id entirely rather than partially leaking it", async () => {
    process.env.S3_ACCESS_KEY_ID = "short";
    process.env.S3_SECRET_ACCESS_KEY = "x";

    const logged = await constructAndCaptureLog();

    expect(logged.accessKeyId).toBe("***");
  });

  it("reports no credentials when neither key is set", async () => {
    const logged = await constructAndCaptureLog();

    expect(logged.accessKeyId).toBe("(none — falling back to default credential provider chain)");
    expect(logged.secretAccessKeyLength).toBe(0);
  });

  it("defaults region to us-east-1 when AWS_REGION is unset", async () => {
    const logged = await constructAndCaptureLog();

    expect(logged.region).toBe("us-east-1");
  });
});
