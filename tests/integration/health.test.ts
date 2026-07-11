import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/health/route";

describe("GET /api/health", () => {
  it("reports ok for both mongo and s3 against the local Docker stack", async () => {
    const response = await GET();
    const body = (await response.json()) as { mongo: string; s3: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ mongo: "ok", s3: "ok" });
  });
});
