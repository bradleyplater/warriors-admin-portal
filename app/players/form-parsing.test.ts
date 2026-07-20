import { describe, expect, it } from "vitest";
import { optionalString, parsePlayerFormData } from "./form-parsing";

describe("optionalString", () => {
  it("passes through a present non-empty value, trimmed", () => {
    expect(optionalString("  Lightning  ")).toBe("Lightning");
  });

  it("returns undefined for an empty string", () => {
    expect(optionalString("")).toBeUndefined();
  });

  it("returns undefined for a whitespace-only string", () => {
    expect(optionalString("   ")).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(optionalString(null)).toBeUndefined();
  });
});

function baseFormData(): FormData {
  const formData = new FormData();
  formData.set("firstName", "Testy");
  formData.set("surname", "McTestface");
  formData.set("number", "61");
  formData.append("positions", "Forward");
  formData.set("active", "on");
  return formData;
}

describe("parsePlayerFormData", () => {
  it("parses a fully valid submission", () => {
    const result = parsePlayerFormData(baseFormData(), "TM551420");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        firstName: "Testy",
        surname: "McTestface",
        number: 61,
        positions: ["Forward"],
        active: true,
        teamId: "TM551420",
      });
    }
  });

  it("omits nickname and imagePath entirely when not submitted, rather than setting them to undefined", () => {
    const result = parsePlayerFormData(baseFormData(), "TM551420");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.hasOwn(result.data, "nickname")).toBe(false);
      expect(Object.hasOwn(result.data, "imagePath")).toBe(false);
    }
  });

  it("includes a trimmed nickname and imagePath when submitted", () => {
    const formData = baseFormData();
    formData.set("nickname", "  Sparky  ");
    formData.set("imagePath", "plr100010.jpg");
    const result = parsePlayerFormData(formData, "TM551420");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBe("Sparky");
      expect(result.data.imagePath).toBe("plr100010.jpg");
    }
  });
});
