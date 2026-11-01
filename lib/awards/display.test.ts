import { describe, expect, it } from "vitest";
import { awardCompetitionLabel, awardName } from "./display";

describe("awardName", () => {
  it("uses the category's name", () => {
    expect(awardName({ category: "most-goals" })).toBe("Most goals");
  });

  it("uses the custom name for a one-off award", () => {
    expect(awardName({ customName: "Muffin shot" })).toBe("Muffin shot");
  });
});

describe("awardCompetitionLabel", () => {
  it("labels BOTBC as BOTB", () => {
    expect(awardCompetitionLabel("BOTBC")).toBe("BOTB");
  });

  it("leaves LLIHC as it is", () => {
    expect(awardCompetitionLabel("LLIHC")).toBe("LLIHC");
  });

  it("labels an award with no competition club-wide", () => {
    expect(awardCompetitionLabel(undefined)).toBe("Club-wide");
  });
});
