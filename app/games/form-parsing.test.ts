import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { BlockedRosterPlayer } from "@/lib/repositories";
import type { Game, Player } from "@/lib/schemas";
import {
  describeBlockedPlayer,
  fieldKeyFor,
  mapFieldErrors,
  parseDateInput,
  parseGameDetailsFormData,
  parseGameFormData,
} from "./form-parsing";

describe("fieldKeyFor", () => {
  it("maps a nested roster path to 'roster'", () => {
    expect(fieldKeyFor(["team", "roster", 1, "playerId"])).toBe("roster");
  });

  it("maps the opponent name path to 'opponentName'", () => {
    expect(fieldKeyFor(["opponentTeam", "name"])).toBe("opponentName");
  });

  it("returns a plain top-level string key as-is", () => {
    expect(fieldKeyFor(["type"])).toBe("type");
  });

  it("falls back to 'form' for an unmapped or empty path", () => {
    expect(fieldKeyFor([])).toBe("form");
    expect(fieldKeyFor([0])).toBe("form");
  });
});

describe("mapFieldErrors", () => {
  it("maps each issue to its field key and accumulates multiple messages on the same key", () => {
    const error = new z.ZodError([
      { code: "custom", message: "Roster cannot contain duplicate players", path: ["team", "roster", 1, "playerId"] },
      { code: "custom", message: "Roster cannot contain duplicate players", path: ["team", "roster", 2, "playerId"] },
      { code: "custom", message: "Opponent name is required", path: ["opponentTeam", "name"] },
      { code: "custom", message: "Invalid game type", path: ["type"] },
    ]);

    expect(mapFieldErrors(error)).toEqual({
      roster: [
        "Roster cannot contain duplicate players",
        "Roster cannot contain duplicate players",
      ],
      opponentName: ["Opponent name is required"],
      type: ["Invalid game type"],
    });
  });
});

function baseFormData(): FormData {
  const formData = new FormData();
  formData.set("date", "2024-11-05");
  formData.set("seasonId", "SSN2324");
  formData.set("type", "LLIHC");
  formData.set("location", "AWAY");
  formData.set("opponentName", "Test Opponent");
  formData.append("roster", "PLR000001");
  formData.append("roster", "PLR000002");
  return formData;
}

describe("parseGameFormData", () => {
  it("parses a fully valid submission", () => {
    const result = parseGameFormData(baseFormData(), "TM551420");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.team.roster).toEqual([
        { playerId: "PLR000001" },
        { playerId: "PLR000002" },
      ]);
      expect(result.data.date).toEqual(new Date("2024-11-05"));
    }
  });

  it("treats an omitted date as missing rather than an invalid Date", () => {
    const formData = baseFormData();
    formData.delete("date");
    const result = parseGameFormData(formData, "TM551420");
    expect(result.success).toBe(false);
    if (!result.success) {
      const dateIssue = result.error.issues.find((issue) => issue.path[0] === "date");
      expect(dateIssue).toBeDefined();
    }
  });

  it("treats an empty date string as missing rather than an invalid Date", () => {
    const formData = baseFormData();
    formData.set("date", "");
    const result = parseGameFormData(formData, "TM551420");
    expect(result.success).toBe(false);
    if (!result.success) {
      const dateIssue = result.error.issues.find((issue) => issue.path[0] === "date");
      expect(dateIssue).toBeDefined();
    }
  });
});

describe("parseDateInput", () => {
  it("parses a valid date string", () => {
    const formData = new FormData();
    formData.set("date", "2024-11-05");
    expect(parseDateInput(formData)).toEqual(new Date("2024-11-05"));
  });

  it("returns undefined for a missing date field", () => {
    expect(parseDateInput(new FormData())).toBeUndefined();
  });

  it("returns undefined for an empty date string", () => {
    const formData = new FormData();
    formData.set("date", "");
    expect(parseDateInput(formData)).toBeUndefined();
  });
});

const now = new Date("2024-01-01");

function baseGame(overrides: Partial<Game> = {}): Game {
  return {
    _id: "GME100001",
    date: new Date("2024-01-15"),
    seasonId: "SSN2324",
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLR000001" }],
      goals: [],
      penalties: [],
    },
    opponentTeam: {
      name: "Existing Opponent",
      goals: [],
      penalties: [],
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function detailsFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("date", "2024-02-20");
  formData.set("seasonId", "SSN2223");
  formData.set("type", "LLIHC");
  formData.set("location", "AWAY");
  formData.set("opponentName", "Renamed Opponent");
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseGameDetailsFormData", () => {
  it("parses a valid details submission, carrying over the existing roster/goals/penalties untouched", () => {
    const existing = baseGame();
    const result = parseGameDetailsFormData(detailsFormData(), existing);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toEqual(new Date("2024-02-20"));
      expect(result.data.seasonId).toBe("SSN2223");
      expect(result.data.type).toBe("LLIHC");
      expect(result.data.location).toBe("AWAY");
      expect(result.data.opponentTeam.name).toBe("Renamed Opponent");
      expect(result.data.team.roster).toEqual(existing.team.roster);
    }
  });

  it("rejects an empty opponent name, same as creation", () => {
    const result = parseGameDetailsFormData(
      detailsFormData({ opponentName: "" }),
      baseGame(),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (candidate) =>
          candidate.path[0] === "opponentTeam" && candidate.path[1] === "name",
      );
      expect(issue).toBeDefined();
    }
  });
});

function blockedPlayer(overrides: Partial<BlockedRosterPlayer> = {}): BlockedRosterPlayer {
  return {
    playerId: "PLR000001",
    goalCount: 0,
    assistCount: 0,
    penaltyCount: 0,
    isNetminder: false,
    isManOfTheMatch: false,
    isWarriorOfTheGame: false,
    ...overrides,
  };
}

const players: Player[] = [
  {
    _id: "PLR000001",
    firstName: "Jamie",
    surname: "Ashworth",
    number: 9,
    positions: ["Forward"],
    active: true,
    teamId: "TM551420",
    createdAt: now,
    updatedAt: now,
  },
];

describe("describeBlockedPlayer", () => {
  it("names a single reference category with singular counting", () => {
    const message = describeBlockedPlayer(
      blockedPlayer({ goalCount: 1 }),
      players,
    );
    expect(message).toBe(
      "#9 Jamie Ashworth can't be removed — they scored 1 goal for this game.",
    );
  });

  it("pluralizes counts greater than one", () => {
    const message = describeBlockedPlayer(
      blockedPlayer({ goalCount: 2, penaltyCount: 3 }),
      players,
    );
    expect(message).toContain("scored 2 goals");
    expect(message).toContain("took 3 penalties");
  });

  it("joins multiple reference categories with commas and a trailing 'and'", () => {
    const message = describeBlockedPlayer(
      blockedPlayer({
        goalCount: 2,
        assistCount: 1,
        isManOfTheMatch: true,
      }),
      players,
    );
    expect(message).toBe(
      "#9 Jamie Ashworth can't be removed — they scored 2 goals, recorded 1 assist, and was Man of the Match for this game.",
    );
  });

  it("names the netminder role specifically, not a generic 'award' label", () => {
    const message = describeBlockedPlayer(
      blockedPlayer({ isNetminder: true }),
      players,
    );
    expect(message).toContain("was netminder");
    expect(message).not.toContain("award");
  });

  it("falls back to the raw player id when the player isn't in the provided list", () => {
    const message = describeBlockedPlayer(
      blockedPlayer({ playerId: "PLR999999", goalCount: 1 }),
      players,
    );
    expect(message.startsWith("PLR999999 can't be removed")).toBe(true);
  });
});
