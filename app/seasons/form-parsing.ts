import { z } from "zod";
import { SeasonCreateInputSchema, type SeasonCreateInput } from "@/lib/schemas";

// Kept in a plain module rather than actions.ts: a "use server" file may
// only export async functions, and these need to be unit-testable directly.
const SeasonYearInputSchema = z.object({
  startYear: z.coerce
    .number({ error: "Start year must be a 4-digit year" })
    .int("Start year must be a 4-digit year")
    .min(2000, "Start year must be between 2000 and 2099")
    .max(2099, "Start year must be between 2000 and 2099"),
});

export function deriveSeasonName(startYear: number): string {
  const startShort = String(startYear % 100).padStart(2, "0");
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startShort}/${endShort}`;
}

type ParsedSeasonForm =
  | { success: true; data: SeasonCreateInput }
  | { success: false; errors: Record<string, string[] | undefined> };

export function parseSeasonFormData(formData: FormData): ParsedSeasonForm {
  const yearResult = SeasonYearInputSchema.safeParse({
    startYear: formData.get("startYear"),
  });

  if (!yearResult.success) {
    return {
      success: false,
      errors: yearResult.error.flatten().fieldErrors,
    };
  }

  const name = deriveSeasonName(yearResult.data.startYear);
  const inputResult = SeasonCreateInputSchema.safeParse({ name });

  if (!inputResult.success) {
    // Unreachable given the year bounds above always derive a valid name,
    // but surface under the visible field rather than the hidden `name`.
    return {
      success: false,
      errors: { startYear: inputResult.error.flatten().fieldErrors.name },
    };
  }

  return { success: true, data: inputResult.data };
}
