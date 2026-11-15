import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { NotAGameSheetError, parseGameSheet } from "./parse-sheet";

const FIXTURE = readFileSync(
  join(__dirname, "__fixtures__", "bradford-14-11-26.csv"),
  "utf-8",
);

describe("parseGameSheet — Bradford 14-11-26 fixture", () => {
  const sheet = parseGameSheet(parseCsv(FIXTURE));

  it("reads the game details", () => {
    expect(sheet.homeTeam).toBe("Bradford Ice Wolves");
    expect(sheet.awayTeam).toBe("Peterborough Warriors");
    expect(sheet.date).toBe("14-11-26");
    expect(sheet.competition).toBe("");
  });

  it("reads both sides in full", () => {
    expect(sheet.home.players).toHaveLength(18);
    expect(sheet.home.goals).toHaveLength(2);
    expect(sheet.home.penalties).toHaveLength(2);
    expect(sheet.away.players).toHaveLength(16);
    expect(sheet.away.goals).toHaveLength(11);
    expect(sheet.away.penalties).toHaveLength(2);
  });

  it("reads player totals", () => {
    expect(sheet.away.players).toContainEqual({
      number: "3",
      name: "M. Silsby",
      goals: 4,
      assists: 1,
      pim: null,
    });
  });

  it("reads scoring rows", () => {
    expect(sheet.away.goals[4]).toEqual({
      time: "15:25",
      type: "E",
      scorer: "82",
      assist1: "43",
      assist2: "39",
    });
  });

  it("reads penalty rows", () => {
    expect(sheet.home.penalties[0]).toEqual({
      number: "55",
      pim: "2",
      offence: "ROUGH",
      given: "43:53",
    });
  });

  it("reads the period tables", () => {
    expect(sheet.periodScores).toEqual([
      { team: "Bradford", periods: [0, 0, 2], ot: null, total: 2 },
      { team: "Peterborough", periods: [7, 2, 2], ot: null, total: 11 },
    ]);
    expect(sheet.penaltyMinutes[1]).toEqual({
      team: "Peterborough",
      periods: [2, 0, 2],
      ot: null,
      total: 4,
    });
  });

  it("still parses with every column shifted right by one", () => {
    const shifted = parseCsv(FIXTURE).map((row) => ["", ...row]);
    expect(parseGameSheet(shifted)).toEqual(sheet);
  });
});

describe("parseGameSheet — not a game sheet", () => {
  it("throws when there is no AWAY TEAM section", () => {
    const grid = parseCsv(FIXTURE).filter(
      (row) => !row.some((value) => value.trim() === "AWAY TEAM"),
    );
    expect(() => parseGameSheet(grid)).toThrow(NotAGameSheetError);
  });

  it("throws on an unrelated CSV", () => {
    expect(() => parseGameSheet(parseCsv("name,age\nBob,4\n"))).toThrow(
      NotAGameSheetError,
    );
  });
});
