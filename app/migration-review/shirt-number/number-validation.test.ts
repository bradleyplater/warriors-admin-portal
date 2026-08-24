import { describe, expect, it } from "vitest";
import { parseNewShirtNumber } from "./number-validation";

describe("parseNewShirtNumber", () => {
  it("accepts the boundary values 1 and 99", () => {
    expect(parseNewShirtNumber("1")).toEqual({ number: 1 });
    expect(parseNewShirtNumber("99")).toEqual({ number: 99 });
  });

  it("rejects 0 and 100", () => {
    expect(parseNewShirtNumber("0")).toHaveProperty("error");
    expect(parseNewShirtNumber("100")).toHaveProperty("error");
  });

  it("rejects a non-numeric value", () => {
    expect(parseNewShirtNumber("abc")).toHaveProperty("error");
  });

  it("rejects an empty or missing value", () => {
    expect(parseNewShirtNumber("")).toHaveProperty("error");
    expect(parseNewShirtNumber(null)).toHaveProperty("error");
  });

  it("rejects a non-integer value", () => {
    expect(parseNewShirtNumber("45.5")).toHaveProperty("error");
  });
});
