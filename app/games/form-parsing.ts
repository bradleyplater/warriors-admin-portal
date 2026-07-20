import type { z } from "zod";
import { GameCreateInputSchema } from "@/lib/schemas";

// Cross-field roster/goal/penalty rules in GameCreateInputSchema report
// issues at nested paths (e.g. ["team", "roster", 1, "playerId"]) — map
// those back to the form's own field names so errors render next to the
// right control instead of all collapsing into one generic message.
//
// Kept in a plain module rather than actions.ts: a "use server" file may
// only export async functions, and these need to be unit-testable directly.
export function fieldKeyFor(path: (string | number)[]): string {
  const [first, second] = path;
  if (first === "team" && second === "roster") return "roster";
  if (first === "opponentTeam" && second === "name") return "opponentName";
  if (typeof first === "string") return first;
  return "form";
}

export function mapFieldErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = fieldKeyFor(issue.path as (string | number)[]);
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

export function parseGameFormData(formData: FormData, teamId: string) {
  const dateValue = formData.get("date");
  const date =
    typeof dateValue === "string" && dateValue !== ""
      ? new Date(dateValue)
      : undefined;

  return GameCreateInputSchema.safeParse({
    date,
    seasonId: formData.get("seasonId"),
    type: formData.get("type"),
    location: formData.get("location"),
    team: {
      id: teamId,
      roster: formData.getAll("roster").map((playerId) => ({ playerId })),
      goals: [],
      penalties: [],
    },
    opponentTeam: {
      name: formData.get("opponentName"),
      goals: [],
      penalties: [],
    },
  });
}
