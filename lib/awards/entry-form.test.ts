import { describe, expect, it } from "vitest";
import { CUSTOM_AWARD, parseAwardEntryForm } from "./entry-form";

const players = new Set(["PLR000001", "PLR000002"]);

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(name, item);
    }
  }
  return data;
}

describe("parseAwardEntryForm", () => {
  it("parses a catalogue award for one competition", () => {
    expect(
      parseAwardEntryForm(
        form({
          award: "most-goals",
          competition: "BOTBC",
          winners: "PLR000001",
        }),
        players,
      ),
    ).toEqual({
      ok: true,
      input: {
        category: "most-goals",
        competition: "BOTBC",
        winners: ["PLR000001"],
      },
    });
  });

  it("treats a blank competition as club-wide", () => {
    const result = parseAwardEntryForm(
      form({ award: "coaches-player", competition: "" }),
      players,
    );
    expect(result).toEqual({
      ok: true,
      input: { category: "coaches-player", winners: [] },
    });
  });

  it("parses a custom award, ignoring a leftover category", () => {
    const result = parseAwardEntryForm(
      form({ award: CUSTOM_AWARD, customName: "  Knockout of the year " }),
      players,
    );
    expect(result).toEqual({
      ok: true,
      input: { customName: "Knockout of the year", winners: [] },
    });
  });

  it("drops a custom name typed before switching to a catalogue award", () => {
    const result = parseAwardEntryForm(
      form({ award: "mvp", customName: "Leftover" }),
      players,
    );
    expect(result.ok && result.input).toEqual({ category: "mvp", winners: [] });
  });

  it("keeps several winners, in order, without repeats", () => {
    const result = parseAwardEntryForm(
      form({
        award: "players-player",
        winners: ["PLR000002", "PLR000001", "PLR000002"],
      }),
      players,
    );
    expect(result.ok && result.input.winners).toEqual([
      "PLR000002",
      "PLR000001",
    ]);
  });

  it("keeps a note", () => {
    const result = parseAwardEntryForm(
      form({ award: "captain", note: "Named for 2026/27" }),
      players,
    );
    expect(result.ok && result.input.note).toBe("Named for 2026/27");
  });

  it("keeps hide-total on a stat award", () => {
    const result = parseAwardEntryForm(
      form({ award: "most-points", hideTotal: "on" }),
      players,
    );
    expect(result.ok && result.input.hideTotal).toBe(true);
  });

  it("ignores hide-total on other awards", () => {
    const result = parseAwardEntryForm(
      form({ award: "mvp", hideTotal: "on" }),
      players,
    );
    expect(result.ok && result.input).toEqual({ category: "mvp", winners: [] });
  });

  it("requires an award", () => {
    expect(parseAwardEntryForm(form({}), players)).toEqual({
      ok: false,
      errors: { award: ["Choose an award"] },
    });
  });

  it("rejects an unknown category", () => {
    const result = parseAwardEntryForm(form({ award: "best-hair" }), players);
    expect(!result.ok && result.errors.award).toEqual([
      "Choose an award from the list",
    ]);
  });

  it("requires a name for a custom award", () => {
    const result = parseAwardEntryForm(form({ award: CUSTOM_AWARD }), players);
    expect(!result.ok && result.errors.customName).toEqual([
      "Enter the award's name",
    ]);
  });

  it("rejects text over the length limit", () => {
    const result = parseAwardEntryForm(
      form({
        award: CUSTOM_AWARD,
        customName: "x".repeat(121),
        note: "y".repeat(121),
      }),
      players,
    );
    expect(!result.ok && Object.keys(result.errors)).toEqual([
      "customName",
      "note",
    ]);
  });

  it("rejects a competition awards aren't split by", () => {
    const result = parseAwardEntryForm(
      form({ award: "mvp", competition: "CHALLENGE" }),
      players,
    );
    expect(!result.ok && result.errors.competition).toBeDefined();
  });

  it("rejects a winner who isn't a known player", () => {
    const result = parseAwardEntryForm(
      form({ award: "mvp", winners: ["PLR000001", "PLR999999"] }),
      players,
    );
    expect(!result.ok && result.errors.winners).toEqual([
      "Choose winners from the player list",
    ]);
  });
});
