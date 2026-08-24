import { PlayerCreateInputSchema } from "@/lib/schemas";

// Kept in a plain module rather than actions.ts: a "use server" file may
// only export async functions, and these need to be unit-testable directly.
export function optionalString(value: FormDataEntryValue | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? undefined : trimmed;
}

export function parsePlayerFormData(formData: FormData, teamId: string) {
  const nickname = optionalString(formData.get("nickname"));
  const imagePath = optionalString(formData.get("imagePath"));
  const numberRaw = optionalString(formData.get("number"));

  return PlayerCreateInputSchema.safeParse({
    firstName: optionalString(formData.get("firstName")) ?? "",
    surname: optionalString(formData.get("surname")) ?? "",
    positions: formData.getAll("positions"),
    active: formData.get("active") !== null,
    // Omit rather than set to `undefined`: the MongoDB driver serializes an
    // explicit `undefined` value as BSON null, which then fails the
    // optional (not nullable) schema field on read-back. A blank number is
    // valid for an inactive player (D9, KAN-36) — the schema's
    // requireNumberWhenActive refine is what rejects it for an active one.
    ...(nickname !== undefined ? { nickname } : {}),
    ...(imagePath !== undefined ? { imagePath } : {}),
    ...(numberRaw !== undefined ? { number: Number(numberRaw) } : {}),
    teamId,
  });
}
