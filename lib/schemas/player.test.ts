import { describe, expect, it } from "vitest";
import { PlayerCreateInputSchema, PlayerSchema } from "./player";

const validPlayer = {
  _id: "PLR502819",
  firstName: "Alex",
  surname: "Smith",
  number: 42,
  positions: ["Forward"],
  active: true,
  teamId: "TM551420",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PlayerSchema", () => {
  it("accepts a valid player", () => {
    expect(PlayerSchema.safeParse(validPlayer).success).toBe(true);
  });

  it.each([0, 100])("rejects number %d out of range", (number) => {
    const result = PlayerSchema.safeParse({ ...validPlayer, number });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric number with the same clear message as an out-of-range one", () => {
    const nonNumeric = PlayerSchema.safeParse({
      ...validPlayer,
      number: Number("abc"),
    });
    const outOfRange = PlayerSchema.safeParse({ ...validPlayer, number: 0 });
    expect(nonNumeric.success).toBe(false);
    expect(outOfRange.success).toBe(false);
    if (!nonNumeric.success && !outOfRange.success) {
      expect(nonNumeric.error.issues[0].message).toBe(
        "Number must be between 1 and 99",
      );
      expect(nonNumeric.error.issues[0].message).toBe(
        outOfRange.error.issues[0].message,
      );
    }
  });

  it.each([1, 99])("accepts number %d at the boundary", (number) => {
    const result = PlayerSchema.safeParse({ ...validPlayer, number });
    expect(result.success).toBe(true);
  });

  it("rejects an empty positions array", () => {
    const result = PlayerSchema.safeParse({ ...validPlayer, positions: [] });
    expect(result.success).toBe(false);
  });

  it("accepts optional nickname and imagePath", () => {
    const result = PlayerSchema.safeParse({
      ...validPlayer,
      nickname: "Smitty",
      imagePath: "smitty.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty imagePath", () => {
    const result = PlayerSchema.safeParse({
      ...validPlayer,
      imagePath: "",
    });
    expect(result.success).toBe(false);
  });

  it("does not check number uniqueness across documents", () => {
    const other = { ...validPlayer, _id: "PLR999999" };
    expect(PlayerSchema.safeParse(validPlayer).success).toBe(true);
    expect(PlayerSchema.safeParse(other).success).toBe(true);
  });
});

describe("PlayerCreateInputSchema", () => {
  it("accepts a payload without _id/createdAt/updatedAt", () => {
    const input = {
      firstName: "Alex",
      surname: "Smith",
      number: 42,
      positions: ["Forward"],
      active: true,
      teamId: "TM551420",
    };
    expect(PlayerCreateInputSchema.safeParse(input).success).toBe(true);
  });
});
