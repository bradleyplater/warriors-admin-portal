import { describe, expect, it } from "vitest";
import { deriveSeasonName, parseSeasonFormData } from "./form-parsing";

function formDataWith(startYear: string) {
  const formData = new FormData();
  formData.set("startYear", startYear);
  return formData;
}

describe("deriveSeasonName", () => {
  it("derives a season name from a start year", () => {
    expect(deriveSeasonName(2026)).toBe("26/27");
  });

  it("rolls over the century boundary", () => {
    expect(deriveSeasonName(2099)).toBe("99/00");
  });
});

describe("parseSeasonFormData", () => {
  it("accepts a valid start year", () => {
    const result = parseSeasonFormData(formDataWith("2026"));
    expect(result).toEqual({ success: true, data: { name: "26/27" } });
  });

  it("rejects a non-numeric start year", () => {
    const result = parseSeasonFormData(formDataWith("abc"));
    expect(result.success).toBe(false);
  });

  it("rejects a start year below 2000", () => {
    const result = parseSeasonFormData(formDataWith("1999"));
    expect(result.success).toBe(false);
  });

  it("rejects a start year above 2099", () => {
    const result = parseSeasonFormData(formDataWith("2100"));
    expect(result.success).toBe(false);
  });
});
