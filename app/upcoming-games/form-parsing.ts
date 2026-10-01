import type { z } from "zod";
import { UpcomingGameCreateInputSchema } from "@/lib/schemas";

// Kept in a plain module rather than actions.ts: a "use server" file may
// only export async functions, and these need to be unit-testable directly.

function formString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export function parseUpcomingGameFormData(formData: FormData) {
  const location = formData.get("location");
  // A home game has no venue, so anything submitted for it is discarded
  // rather than failing validation — and the key is left out entirely, so
  // the stored document has no `venue` field at all.
  const venue = location === "HOME" ? undefined : formString(formData.get("venue"));
  return UpcomingGameCreateInputSchema.safeParse({
    opponentId: formString(formData.get("opponentId")),
    date: formString(formData.get("date")),
    time: formString(formData.get("time")),
    location,
    ...(venue !== undefined && { venue }),
    type: formData.get("type"),
  });
}

export function mapUpcomingGameFieldErrors(
  error: z.ZodError,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const [first] = issue.path;
    const key = typeof first === "string" ? first : "form";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}
