import { expect, test } from "@playwright/test";
import { ensureOpponent } from "./support/opponents";

// Builds a game sheet in the season workbook's layout (see
// lib/game-import/__fixtures__/bradford-14-11-26.csv) using seeded players,
// so it matches the shared local database. Warriors at home this time.
const OPPONENT = "E2E Import Opponent";

function buildSheet(): string {
  const grid: string[][] = Array.from({ length: 54 }, () =>
    Array<string>(26).fill(""),
  );
  const put = (row: number, col: number, values: string[]) =>
    values.forEach((value, i) => (grid[row][col + i] = value));
  const header = [
    "No.",
    "PLAYER",
    "G",
    "A",
    "PM",
    "No",
    "Time",
    "Tyoe",
    "G",
    "A",
    "A",
    "No.",
    "PIM",
    "Offence",
    "Given",
    "Start",
    "End",
  ];

  // Home: Warriors. #14's name is deliberately wrong so it gets flagged.
  put(1, 1, ["HOME TEAM"]);
  put(3, 1, header);
  put(4, 1, ["9", "J. Ashworth", "1", "1", ""]);
  put(4, 6, ["1", "05:00", "E", "9", "11", ""]);
  put(4, 12, ["11", "2", "TRIP", "12:00", "12:00", "14:00"]);
  put(5, 1, ["11", "C. Baxter", "", "1", "2"]);
  put(5, 6, ["2", "25:10", "PP", "14", "9", ""]);
  put(6, 1, ["14", "D. Wrongname", "1", "", ""]);

  put(12, 19, ["Home Team:", "", "Peterborough Warriors"]);
  put(13, 19, ["Away Team:", "", OPPONENT]);
  put(14, 19, ["DATE:", "05-11-23"]);
  put(16, 19, ["Competition:"]);
  put(19, 19, ["Period Scores", "", "1", "2", "3", "OT", "Total"]);
  put(20, 19, ["Peterborough", "", "1", "1", "0", "", "2"]);
  put(21, 19, ["Opponent", "", "0", "0", "1", "", "1"]);
  put(23, 19, ["Penalty Minutes", "", "1", "2", "3", "OT", "Total"]);
  put(24, 19, ["Peterborough", "", "2", "0", "0", "", "2"]);
  put(25, 19, ["Opponent", "", "0", "0", "0", "", "0"]);

  // Away: the opponent.
  put(28, 1, ["AWAY TEAM"]);
  put(30, 1, header);
  put(31, 1, ["7", "X. Visitor", "1", "", ""]);
  put(31, 6, ["1", "45:30", "E", "7", "", ""]);

  return grid.map((row) => row.join(",")).join("\n") + "\n";
}

test.describe.configure({ mode: "serial" });

test.describe("import a game from CSV", () => {
  test("rejects a file that isn't a game sheet", async ({ page }) => {
    await page.goto("/games/import");
    await page.getByLabel("Game sheet CSV").setInputFiles({
      name: "nope.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("name,age\nBob,4\n"),
    });
    await expect(page.getByText(/isn't a recognised game sheet/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save to database" }),
    ).toHaveCount(0);
  });

  test("flags a mismatched player, then saves once it's fixed", async ({
    page,
  }) => {
    await ensureOpponent(page, OPPONENT);
    await page.goto("/games");
    await page.getByRole("link", { name: "Import from CSV" }).click();
    await expect(page).toHaveURL(/\/games\/import$/);

    await page.getByLabel("Game sheet CSV").setInputFiles({
      name: "e2e-game.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(buildSheet()),
    });

    const flagged = page.getByTestId("import-player-14");
    await expect(flagged).toHaveAttribute("data-status", "flagged");
    await expect(flagged).toContainText("Number 14 belongs to Dean Crosbie");
    await expect(page.getByTestId("import-player-9")).toHaveAttribute(
      "data-status",
      "matched",
    );
    await expect(page.getByTestId("import-score")).toHaveText("2 — 1");
    const save = page.getByRole("button", { name: "Save to database" });
    await expect(save).toBeDisabled();

    // Nothing is saved until the admin clicks Save, so fix the flags.
    await page
      .getByLabel("Portal player for sheet number 14")
      .selectOption({ label: "#14 Dean Crosbie (suggested)" });
    await expect(flagged).toHaveAttribute("data-status", "resolved");
    await page.getByLabel("Game type").selectOption("LLIHC");

    await expect(page.getByText("Ready to save")).toBeVisible();
    await expect(save).toBeEnabled();
    await save.click();

    await expect(page).toHaveURL(/\/games\/GME\d+$/);
    await expect(
      page.getByRole("heading", { name: new RegExp(OPPONENT) }),
    ).toBeVisible();
    await expect(page.getByText("2023-11-05")).toBeVisible();
    await expect(page.getByText("LLIHC")).toBeVisible();
    await expect(page.getByText(/Dean Crosbie/).first()).toBeVisible();
    await expect(page.getByText("X. Visitor").first()).toBeVisible();
  });
});
