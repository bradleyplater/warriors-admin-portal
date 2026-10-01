import { describe, expect, it } from "vitest";
import {
  mapUpcomingGameFieldErrors,
  parseUpcomingGameFormData,
} from "./form-parsing";

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

const awayGame = {
  opponentId: "OPN123456",
  date: "2026-10-03",
  time: "20:30",
  location: "AWAY",
  venue: "Riverside Leisure Centre",
  type: "CHALLENGE",
};

describe("parseUpcomingGameFormData", () => {
  it("parses an away game with its venue", () => {
    const result = parseUpcomingGameFormData(formData(awayGame));
    expect(result.success).toBe(true);
    expect(result.data).toEqual(awayGame);
  });

  it("discards the venue for a home game", () => {
    const result = parseUpcomingGameFormData(
      formData({ ...awayGame, location: "HOME" }),
    );
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("venue");
  });

  it("reports a missing venue for an away game on the venue field", () => {
    const result = parseUpcomingGameFormData(formData({ ...awayGame, venue: "" }));
    expect(result.success).toBe(false);
    expect(mapUpcomingGameFieldErrors(result.error!)).toHaveProperty("venue");
  });

  it("reports each missing field against its own key", () => {
    const result = parseUpcomingGameFormData(formData({}));
    expect(result.success).toBe(false);
    const errors = mapUpcomingGameFieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(
      ["date", "location", "opponentId", "time", "type"].sort(),
    );
  });
});
