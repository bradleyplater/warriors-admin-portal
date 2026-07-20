import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldKeyFor, mapFieldErrors, parseGameFormData } from "./form-parsing";

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
