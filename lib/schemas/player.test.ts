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

  it.each([1, 99])("accepts number %d at the boundary", (number) => {
    const result = PlayerSchema.safeParse({ ...validPlayer, number });
    expect(result.success).toBe(true);
  });

  it("rejects an empty positions array", () => {
    const result = PlayerSchema.safeParse({ ...validPlayer, positions: [] });
    expect(result.success).toBe(false);
  });

  it("accepts optional nickname and imageUrl", () => {
    const result = PlayerSchema.safeParse({
      ...validPlayer,
      nickname: "Smitty",
      imageUrl: "https://example.com/players/smitty.jpg",
    });
    expect(result.success).toBe(true);
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
