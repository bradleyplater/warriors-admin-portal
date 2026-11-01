import { existsSync } from "node:fs";
import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";
import {
  createGame,
  createPlayer,
  createSeason,
  deleteGame,
  deletePlayer,
  DuplicateSeasonError,
  getPlayer,
  getTheTeam,
} from "@/lib/repositories";
import { getDb } from "@/lib/mongodb";

// Shares the app's MONGODB_URI, like games-freshness.spec.ts, so the test can
// set up and clean away its own season directly.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env.example")) {
  process.loadEnvFile(".env.example");
}

// One season, one evening: the tests build on each other.
test.describe.configure({ mode: "serial" });

const SEASON_ID = "SSN3839";
const EVENING_ID = "EVE3839";

async function removeTestData() {
  const db = await getDb();
  await db
    .collection<{ _id: string }>("AwardEvening")
    .deleteOne({ _id: EVENING_ID });
  await db.collection<{ _id: string }>("Seasons").deleteOne({ _id: SEASON_ID });
}

// A BOTB game in the test season where the coach (flagged to be left out
// of stat awards) outscores the other player, 2 goals to 1.
let scorerId = "";
let coachId = "";
let gameId = "";

test.beforeAll(async () => {
  await removeTestData();
  // Created after the server started, so the list also proves /awards isn't
  // frozen at build time.
  await createSeason({ name: "38/39" }).catch((error: unknown) => {
    if (!(error instanceof DuplicateSeasonError)) throw error;
  });

  const teamId = (await getTheTeam())!._id;
  const testPlayer = (surname: string, excludeFromStatAwards: boolean) =>
    createPlayer({
      firstName: "Awardtest",
      surname,
      positions: ["Forward"],
      active: false,
      excludeFromStatAwards,
      teamId,
    });
  scorerId = (await testPlayer("Scorer", false))._id;
  coachId = (await testPlayer("Coach", true))._id;
  const goal = (scoredBy: string, minute: number) => ({
    scoredBy,
    minute,
    second: 0,
    type: "EVEN" as const,
  });
  gameId = (
    await createGame({
      date: new Date("2038-11-01"),
      seasonId: SEASON_ID,
      type: "BOTBC",
      location: "HOME",
      team: {
        id: teamId,
        roster: [{ playerId: scorerId }, { playerId: coachId }],
        goals: [goal(coachId, 1), goal(coachId, 2), goal(scorerId, 3)],
        penalties: [],
      },
      opponentTeam: { opponentId: "OPN000001", goals: [], penalties: [] },
    })
  )._id;
});

test.afterAll(async () => {
  await deleteGame(gameId).catch(() => undefined);
  for (const id of [scorerId, coachId]) {
    await deletePlayer(id).catch(() => undefined);
  }
  await removeTestData();
});

const entries = (page: Page) => page.getByTestId("award-entry");

async function portraitJpeg() {
  const buffer = await sharp({
    create: {
      width: 800,
      height: 1000,
      channels: 3,
      background: { r: 30, g: 60, b: 160 },
    },
  })
    .jpeg()
    .toBuffer();
  return { name: "award.jpg", mimeType: "image/jpeg", buffer };
}

test.describe("awards", () => {
  test("create an evening for a season", async ({ page }) => {
    await page.goto("/awards");
    await page.getByLabel("Season").selectOption({ label: "38/39" });
    await page.getByRole("button", { name: "Create awards evening" }).click();

    await expect(page).toHaveURL(`/awards/${EVENING_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Awards 38/39",
    );

    // The season isn't offered again.
    await page.goto("/awards");
    await expect(
      page.getByLabel("Season").locator("option", { hasText: "38/39" }),
    ).toHaveCount(0);
    await expect(page.getByRole("row", { name: /38\/39/ })).toContainText(
      "Draft",
    );
  });

  test("start from the standard awards", async ({ page }) => {
    await page.goto(`/awards/${EVENING_ID}`);
    await page.getByRole("button", { name: "Add the standard awards" }).click();

    await expect(entries(page)).toHaveCount(24);
    await expect(page.getByTestId("award-count")).toHaveText(
      "24 · 24 to be announced",
    );
    await expect(entries(page).first()).toContainText("Most valuable player");
    await expect(entries(page).first()).toContainText("BOTB");
  });

  test("pick a winner", async ({ page }) => {
    await page.goto(`/awards/${EVENING_ID}`);
    await page
      .getByRole("link", { name: "Edit Most valuable player (BOTB)" })
      .click();
    await page.getByRole("checkbox", { name: /Jamie Ashworth/ }).check();
    await page.getByRole("button", { name: "Save award" }).click();

    await expect(page).toHaveURL(`/awards/${EVENING_ID}`);
    await expect(entries(page).first()).toContainText("Jamie Ashworth");
    await expect(page.getByTestId("award-count")).toHaveText(
      "24 · 23 to be announced",
    );
  });

  test("suggest most goals from the games, leaving out the coach", async ({
    page,
  }) => {
    await page.goto(`/awards/${EVENING_ID}`);
    const mostGoals = entries(page)
      .filter({ hasText: "Most goals" })
      .filter({ hasText: "BOTB" });
    await expect(mostGoals).toContainText(
      "Suggested: Awardtest Scorer · 1 goal",
    );

    await page.getByRole("link", { name: "Edit Most goals (BOTB)" }).click();
    await expect(page.getByTestId("stat-suggestion")).toContainText(
      "From the games: Awardtest Scorer · 1 goal",
    );
    await page.getByRole("button", { name: "Use suggestion" }).click();

    await expect(page).toHaveURL(`/awards/${EVENING_ID}`);
    await expect(mostGoals).toContainText("Awardtest Scorer · 1 goal");
    await expect(mostGoals).not.toContainText("Suggested");
  });

  test("clearing the coach flag on the player form brings them back", async ({
    page,
  }) => {
    await page.goto(`/players/${coachId}/edit`);
    const flag = page.getByRole("checkbox", {
      name: /Leave out of the most goals/,
    });
    await expect(flag).toBeChecked();
    await flag.uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/players");
    expect((await getPlayer(coachId))?.excludeFromStatAwards).toBeUndefined();

    await page.goto(`/awards/${EVENING_ID}`);
    await page.getByRole("link", { name: "Edit Most goals (BOTB)" }).click();
    await expect(page.getByTestId("stat-suggestion")).toContainText(
      "From the games: Awardtest Coach · 2 goals",
    );
  });

  test("add a one-off club award and move it up", async ({ page }) => {
    await page.goto(`/awards/${EVENING_ID}/entries/new`);
    await page.getByLabel("Award", { exact: true }).selectOption("custom");
    await page.getByLabel("Award name").fill("Knockout of the year");
    await page.getByRole("button", { name: "Add award" }).click();

    await expect(page).toHaveURL(`/awards/${EVENING_ID}`);
    await expect(entries(page).last()).toContainText("Knockout of the year");
    await expect(entries(page).last()).toContainText("Club-wide");

    await page
      .getByRole("button", { name: "Move Knockout of the year (Club-wide) up" })
      .click();
    await expect(entries(page).nth(-2)).toContainText("Knockout of the year");
  });

  test("a custom award needs a name", async ({ page }) => {
    await page.goto(`/awards/${EVENING_ID}/entries/new`);
    await page.getByLabel("Award", { exact: true }).selectOption("custom");
    await page.getByRole("button", { name: "Add award" }).click();

    await expect(page.getByText("Enter the award's name")).toBeVisible();
    await expect(page).toHaveURL(`/awards/${EVENING_ID}/entries/new`);
  });

  test("add, show and delete an award photo", async ({ page }) => {
    await page.goto(`/awards/${EVENING_ID}`);
    await page
      .getByRole("link", { name: "Edit Most valuable player (BOTB)" })
      .click();

    await page.getByLabel("Add a photo").setInputFiles(await portraitJpeg());
    const photo = page.getByTestId("award-photo");
    await expect(photo).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete photo" }).click();
    await expect(photo).toHaveCount(0);
  });

  test("delete an award", async ({ page }) => {
    await page.goto(`/awards/${EVENING_ID}`);
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Delete Knockout of the year (Club-wide)" })
      .click();

    await expect(entries(page)).toHaveCount(24);
    await expect(page.getByText("Knockout of the year")).toHaveCount(0);
  });

  test("announce the evening", async ({ page }) => {
    await page.goto(`/awards/${EVENING_ID}`);
    await page.getByRole("radio", { name: /Announced/ }).check();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByRole("radio", { name: /Announced/ })).toBeChecked();
    await page.goto("/awards");
    await expect(page.getByRole("row", { name: /38\/39/ })).toContainText(
      "Announced",
    );
  });
});
