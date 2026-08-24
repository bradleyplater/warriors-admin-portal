import { PlayerCreateInputSchema } from "@/lib/schemas";

// Kept in a plain module rather than actions.ts: a "use server" file may
// only export async functions, and this needs to be unit-testable directly.
// Reuses the same field schema the normal player form validates against
// (app/players/form-parsing.ts), so "1-99" stays defined in one place.
export function parseNewShirtNumber(
  raw: FormDataEntryValue | null,
): { number: number } | { error: string } {
  const result = PlayerCreateInputSchema.shape.number.safeParse(Number(raw));
  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Number must be between 1 and 99.",
    };
  }
  return { number: result.data };
}
