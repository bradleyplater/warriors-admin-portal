import { existsSync } from "node:fs";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { expect, test } from "@playwright/test";
import { getS3Client } from "@/lib/s3";

// Core Journey #6 (docs/05-testing-strategy.md) / KAN-32's acceptance
// criteria: change data -> indicator appears -> publish -> indicator
// clears -> artifact in local S3 reflects the change. Uses Node's native
// .env loader, mirroring games-freshness.spec.ts, so this test process
// shares the same S3 config as the running app under test.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env.example")) {
  process.loadEnvFile(".env.example");
}

test.describe.configure({ mode: "serial" });

test.describe("publish flow", () => {
  test("editing a player surfaces the indicator, publishing clears it, and the artifact reflects the change", async ({
    page,
  }) => {
    // 1. Change data.
    await page.goto("/players/new");
    await page.getByLabel("First name").fill("Publish");
    await page.getByLabel("Surname").fill("Journey");
    await page.getByLabel("Shirt number").fill("95");
    await page.getByRole("checkbox", { name: "Forward" }).check();
    await page.getByRole("button", { name: "Create player" }).click();
    await expect(page).toHaveURL(/\/players$/);

    const row = page.getByRole("row", { name: /Publish Journey/ });
    await row.getByRole("link", { name: /^Edit / }).click();
    await page.getByLabel("Nickname (optional)").fill("PubTest");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/players$/);

    // 2. Indicator appears.
    const status = page.getByTestId("publish-status");
    await expect(status).toHaveAttribute("data-state", "unpublished");
    await expect(status).toContainText("Unpublished changes");

    // 3. Publish, with visible progress and a success confirmation.
    const publishButton = page.getByRole("button", { name: /^Publish$/ });
    await publishButton.click();
    await expect(page.getByRole("status")).toHaveText("Published", {
      timeout: 30_000,
    });

    // 4. Indicator clears.
    await expect(status).toHaveAttribute("data-state", "up-to-date");
    await expect(status).toContainText("Up to date");

    // 5. The artifact in local S3 reflects the change.
    const bucket = process.env.S3_BUCKET;
    const response = await getS3Client().send(
      new GetObjectCommand({ Bucket: bucket, Key: "players.json" }),
    );
    const body = await response.Body?.transformToString();
    const players: unknown = JSON.parse(body ?? "[]");
    expect(Array.isArray(players)).toBe(true);
    const published = (players as { number: number; nickname?: string }[]).find(
      (p) => p.number === 95,
    );
    expect(published?.nickname).toBe("PubTest");
  });
});
