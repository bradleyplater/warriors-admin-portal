import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GameCreateInputSchema } from "../schemas";
import { parseCsv } from "./csv";
import { parseGameSheet, type ParsedSheet } from "./parse-sheet";
import {
  mapGoalType,
  mapPenaltyCode,
  parseSheetDate,
  resolveImport,
  seasonNameFor,
  splitSheetName,
} from "./resolve";
import type { PortalContext } from "./types";

const FIXTURE = readFileSync(
  join(__dirname, "__fixtures__", "bradford-14-11-26.csv"),
  "utf-8",
);
const sheet = () => parseGameSheet(parseCsv(FIXTURE));

// The 16 Warriors on the fixture, as portal players.
const ROSTER: [number, string, string][] = [
  [31, "Adam", "Beeton-Jones"],
  [24, "Alex", "Johnson"],
  [2, "Andy", "Barker"],
  [67, "Ben", "Warby"],
  [82, "Chris", "Phillips"],
  [72, "Dan", "Sztymon"],
  [88, "Dave", "Bush"],
  [59, "Luke", "Coulby-Mills"],
  [3, "Matt", "Silsby"],
  [43, "Nick", "Eves"],
  [93, "Paul", "Hutchcraft"],
  [17, "Pete", "Bird"],
  [63, "Rob", "Davies"],
  [33, "Sam", "Miljons"],
  [6, "Stef", "Zutis"],
  [39, "Steve", "Davies"],
];

const idFor = (number: number) => `PLR${String(100000 + number)}`;

function context(overrides: Partial<PortalContext> = {}): PortalContext {
  return {
    team: { _id: "TM000001", name: "Peterborough Warriors" },
    players: ROSTER.map(([number, firstName, surname]) => ({
      _id: idFor(number),
      firstName,
      surname,
      number,
      active: true,
    })),
    opponents: [
      { _id: "OPN000001", name: "Bradford Ice Wolves" },
      { _id: "OPN000002", name: "Sheffield Senators" },
    ],
    seasons: [
      { _id: "SSN2526", name: "25/26", active: true },
      { _id: "SSN2627", name: "26/27" },
    ],
    games: [],
    ...overrides,
  };
}

const withCompetition = (competition: string): ParsedSheet => ({
  ...sheet(),
  competition,
});

describe("resolveImport — full fixture", () => {
  const preview = resolveImport(sheet(), context(), { gameType: "CHALLENGE" });

  it("has no flags and no warnings", () => {
    expect(preview.flags).toEqual([]);
    expect(preview.warnings).toEqual([]);
  });

  it("derives the details", () => {
    expect(preview.details).toMatchObject({
      warriorsSide: "AWAY",
      opponentId: "OPN000001",
      date: "2026-11-14",
      seasonId: "SSN2627",
      gameType: "CHALLENGE",
    });
  });

  it("builds an 11–2 AWAY game that passes GameCreateInputSchema", () => {
    const input = preview.input!;
    expect(input).not.toBeNull();
    expect(GameCreateInputSchema.safeParse(input).success).toBe(true);
    expect(input.location).toBe("AWAY");
    expect(input.date).toEqual(new Date("2026-11-14"));
    expect(input.team.roster).toHaveLength(16);
    expect(input.team.goals).toHaveLength(11);
    expect(input.team.penalties).toHaveLength(2);
    expect(input.opponentTeam.goals).toHaveLength(2);
    expect(input.opponentTeam.penalties).toHaveLength(2);
  });

  it("converts a Warriors goal with two assists", () => {
    expect(preview.input!.team.goals[4]).toEqual({
      scoredBy: idFor(82),
      assist1: idFor(43),
      assist2: idFor(39),
      minute: 15,
      second: 25,
      type: "EVEN",
    });
  });

  it("names opponent events from their player list", () => {
    expect(preview.input!.opponentTeam.penalties[0]).toEqual({
      offender: "J. Cooper",
      minute: 43,
      second: 53,
      type: "ROUGH",
      duration: 2,
    });
    expect(preview.input!.opponentTeam.goals[0].scoredBy).toBe("G. Lapinski");
  });
});

describe("resolveImport — details", () => {
  it("flags a blank competition and reads a known one", () => {
    const blank = resolveImport(sheet(), context());
    expect(blank.flags.map((f) => f.target)).toEqual(["detail:gameType"]);
    expect(blank.input).toBeNull();

    const known = resolveImport(withCompetition("llihc"), context());
    expect(known.flags).toEqual([]);
    expect(known.details.gameType).toBe("LLIHC");
  });

  it("never picks NIHC from the competition cell", () => {
    const preview = resolveImport(withCompetition("NIHC"), context());
    expect(preview.flags.map((f) => f.target)).toContain("detail:gameType");
  });

  it("flags an unknown opponent and accepts a chosen one", () => {
    const ctx = context({
      opponents: [{ _id: "OPN000002", name: "Sheffield Senators" }],
    });
    const flagged = resolveImport(sheet(), ctx, { gameType: "CHALLENGE" });
    expect(flagged.flags.map((f) => f.target)).toEqual(["detail:opponent"]);

    const chosen = resolveImport(sheet(), ctx, {
      gameType: "CHALLENGE",
      opponentId: "OPN000002",
    });
    expect(chosen.flags).toEqual([]);
    expect(chosen.input!.opponentTeam.opponentId).toBe("OPN000002");
  });

  it("flags the Warriors side when no team name matches", () => {
    const ctx = context({ team: { _id: "TM000001", name: "Somebody Else" } });
    const preview = resolveImport(sheet(), ctx, { gameType: "CHALLENGE" });
    expect(preview.flags.map((f) => f.target)).toContain("detail:warriorsSide");
    expect(preview.input).toBeNull();
  });

  it("detects a home game", () => {
    const s = sheet();
    const swapped: ParsedSheet = {
      ...s,
      homeTeam: s.awayTeam,
      awayTeam: s.homeTeam,
      home: s.away,
      away: s.home,
      periodScores: [s.periodScores[1], s.periodScores[0]],
      penaltyMinutes: [s.penaltyMinutes[1], s.penaltyMinutes[0]],
    };
    const preview = resolveImport(swapped, context(), {
      gameType: "CHALLENGE",
    });
    expect(preview.flags).toEqual([]);
    expect(preview.warnings).toEqual([]);
    expect(preview.input!.location).toBe("HOME");
  });

  it("flags a missing season and accepts a chosen one", () => {
    const ctx = context({
      seasons: [{ _id: "SSN2526", name: "25/26", active: true }],
    });
    const flagged = resolveImport(sheet(), ctx, { gameType: "CHALLENGE" });
    expect(flagged.flags.map((f) => f.target)).toEqual(["detail:season"]);
    const chosen = resolveImport(sheet(), ctx, {
      gameType: "CHALLENGE",
      seasonId: "SSN2526",
    });
    expect(chosen.input!.seasonId).toBe("SSN2526");
  });

  it("lets the admin override the date", () => {
    const preview = resolveImport(sheet(), context(), {
      gameType: "CHALLENGE",
      date: "2026-11-15",
    });
    expect(preview.input!.date).toEqual(new Date("2026-11-15"));
  });

  it("warns about a game against the same opponent on the same day", () => {
    const ctx = context({
      games: [
        {
          _id: "GME000123",
          date: new Date("2026-11-14"),
          opponentTeam: { opponentId: "OPN000001" },
        },
      ],
    });
    const preview = resolveImport(sheet(), ctx, { gameType: "CHALLENGE" });
    expect(preview.warnings).toEqual([
      expect.objectContaining({ gameId: "GME000123" }),
    ]);
    expect(preview.input).not.toBeNull();
  });
});

describe("resolveImport — player matching", () => {
  const renumber = (number: number, newNumber: number) =>
    context().players.map((p) =>
      p._id === idFor(number) ? { ...p, number: newNumber } : p,
    );

  it("flags a number that belongs to a differently named player", () => {
    const players = context().players.map((p) =>
      p._id === idFor(24) ? { ...p, firstName: "Zed", surname: "Other" } : p,
    );
    const preview = resolveImport(sheet(), context({ players }), {
      gameType: "CHALLENGE",
    });
    expect(preview.flags).toEqual([
      { target: "player:24", message: "Number 24 belongs to Zed Other" },
    ]);
    expect(preview.players.find((p) => p.number === "24")?.status).toBe(
      "flagged",
    );
  });

  it("flags a name found under a different number and suggests it", () => {
    const preview = resolveImport(
      sheet(),
      context({ players: renumber(72, 71) }),
      { gameType: "CHALLENGE" },
    );
    expect(preview.flags).toEqual([
      { target: "player:72", message: "D. Sztymon is number 71 in the portal" },
    ]);
    expect(
      preview.players.find((p) => p.number === "72")?.suggestedPlayerId,
    ).toBe(idFor(72));
  });

  it("flags a player with no match at all", () => {
    const players = context().players.filter((p) => p._id !== idFor(93));
    const preview = resolveImport(sheet(), context({ players }), {
      gameType: "CHALLENGE",
    });
    expect(preview.flags).toEqual([
      {
        target: "player:93",
        message: "No active player with number 93 or name P. Hutchcraft",
      },
    ]);
  });

  it("does not match inactive players automatically", () => {
    const players = context().players.map((p) =>
      p._id === idFor(3) ? { ...p, active: false } : p,
    );
    const preview = resolveImport(sheet(), context({ players }), {
      gameType: "CHALLENGE",
    });
    expect(preview.flags.map((f) => f.target)).toEqual(["player:3"]);
  });

  it("applies a resolution to every reference of that number", () => {
    const players = [
      ...context().players.map((p) =>
        p._id === idFor(3) ? { ...p, active: false } : p,
      ),
    ];
    const preview = resolveImport(sheet(), context({ players }), {
      gameType: "CHALLENGE",
      players: { "3": idFor(3) },
    });
    expect(preview.flags).toEqual([]);
    const input = preview.input!;
    expect(
      input.team.goals.filter((g) => g.scoredBy === idFor(3)),
    ).toHaveLength(4);
    expect(
      input.team.goals.filter(
        (g) => g.assist1 === idFor(3) || g.assist2 === idFor(3),
      ),
    ).toHaveLength(1);
    expect(input.team.roster).toContainEqual({ playerId: idFor(3) });
  });

  it("flags two sheet rows resolved to the same player", () => {
    const preview = resolveImport(sheet(), context(), {
      gameType: "CHALLENGE",
      players: { "63": idFor(39) },
    });
    expect(preview.flags.map((f) => f.target).sort()).toEqual([
      "player:39",
      "player:63",
    ]);
    expect(preview.input).toBeNull();
  });

  it("flags event numbers missing from the player list", () => {
    const s = sheet();
    s.away.goals[0] = { ...s.away.goals[0], scorer: "99" };
    const preview = resolveImport(s, context(), { gameType: "CHALLENGE" });
    const row = preview.players.find((p) => p.number === "99");
    expect(row).toMatchObject({ listed: false, status: "flagged" });
    expect(preview.flags.map((f) => f.target)).toContain("player:99");
  });
});

describe("resolveImport — events", () => {
  it("flags an unknown goal type and accepts a chosen one", () => {
    const s = sheet();
    s.away.goals[0] = { ...s.away.goals[0], type: "XX" };
    const flagged = resolveImport(s, context(), { gameType: "CHALLENGE" });
    expect(flagged.flags.map((f) => f.target)).toEqual(["goal:team:0:type"]);
    const chosen = resolveImport(s, context(), {
      gameType: "CHALLENGE",
      goalTypes: { "goal:team:0": "PP" },
    });
    expect(chosen.input!.team.goals[0].type).toBe("PP");
  });

  it("flags an unknown offence and accepts a chosen one", () => {
    const s = sheet();
    s.home.penalties[0] = { ...s.home.penalties[0], offence: "WHATEVER" };
    const flagged = resolveImport(s, context(), { gameType: "CHALLENGE" });
    expect(flagged.flags.map((f) => f.target)).toEqual([
      "penalty:opponent:0:code",
    ]);
    const chosen = resolveImport(s, context(), {
      gameType: "CHALLENGE",
      penaltyCodes: { "penalty:opponent:0": "HOLD" },
    });
    expect(chosen.input!.opponentTeam.penalties[0].type).toBe("HOLD");
  });

  it("flags out-of-range and unreadable times", () => {
    const s = sheet();
    s.away.goals[0] = { ...s.away.goals[0], time: "61:00" };
    s.away.goals[1] = { ...s.away.goals[1], time: "abc" };
    const preview = resolveImport(s, context(), { gameType: "CHALLENGE" });
    expect(preview.flags.map((f) => f.target)).toEqual([
      "goal:team:0:time",
      "goal:team:1:time",
    ]);
  });

  it("maps bench penalties", () => {
    const s = sheet();
    s.away.penalties[0] = { ...s.away.penalties[0], number: "BENCH" };
    const preview = resolveImport(s, context(), { gameType: "CHALLENGE" });
    expect(preview.input!.team.penalties[0].offender).toBe("BENCH");
  });

  it("names an opponent number missing from their list #n, with a warning", () => {
    const s = sheet();
    s.home.goals[0] = { ...s.home.goals[0], scorer: "98" };
    const preview = resolveImport(s, context(), { gameType: "CHALLENGE" });
    expect(preview.input!.opponentTeam.goals[0].scoredBy).toBe("#98");
    expect(preview.warnings.some((w) => w.message.includes("98"))).toBe(true);
  });
});

describe("resolveImport — cross-checks", () => {
  it("warns when a player's sheet total disagrees", () => {
    const s = sheet();
    const silsby = s.away.players.find((p) => p.number === "3")!;
    silsby.goals = 5;
    const preview = resolveImport(s, context(), { gameType: "CHALLENGE" });
    expect(preview.warnings.map((w) => w.message)).toContain(
      "3 M. Silsby: sheet says 5 goals, the event rows give 4",
    );
    expect(preview.input).not.toBeNull();
  });

  it("warns when the period scores disagree", () => {
    const s = sheet();
    s.periodScores[1] = { ...s.periodScores[1], periods: [6, 2, 2] };
    const preview = resolveImport(s, context(), { gameType: "CHALLENGE" });
    expect(preview.warnings.map((w) => w.message)).toContain(
      "Peterborough Warriors goals, period 1: sheet says 6, the event rows give 7",
    );
  });
});

describe("helpers", () => {
  it("splits sheet names", () => {
    expect(splitSheetName("L. Coulby-Mills")).toEqual({
      initial: "l",
      surname: "coulby mills",
    });
    expect(splitSheetName("Matt Silsby")).toEqual({
      initial: "m",
      surname: "silsby",
    });
  });

  it("parses DD-MM-YY dates and rejects impossible ones", () => {
    expect(parseSheetDate("14-11-26")).toBe("2026-11-14");
    expect(parseSheetDate("01/02/2027")).toBe("2027-02-01");
    expect(parseSheetDate("31-02-26")).toBeNull();
    expect(parseSheetDate("")).toBeNull();
  });

  it("derives the season name", () => {
    expect(seasonNameFor("2026-11-14")).toBe("26/27");
    expect(seasonNameFor("2027-03-01")).toBe("26/27");
    expect(seasonNameFor("2026-08-01")).toBe("26/27");
    expect(seasonNameFor("2026-07-31")).toBe("25/26");
  });

  it("maps goal types and penalty codes", () => {
    expect(mapGoalType("E")).toBe("EVEN");
    expect(mapGoalType("pp")).toBe("PP");
    expect(mapGoalType("Empty Net")).toBe("EN");
    expect(mapGoalType("")).toBeNull();
    expect(mapPenaltyCode("rough")).toBe("ROUGH");
    expect(mapPenaltyCode("Cross-Checking")).toBe("CROSS");
    expect(mapPenaltyCode("nope")).toBeNull();
  });
});
