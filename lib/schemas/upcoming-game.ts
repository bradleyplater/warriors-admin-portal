import { z } from "zod";
import { GameTypeSchema } from "./enums";
import { OPPONENT_ID_PATTERN } from "./opponent";

export const UPCOMING_GAME_ID_PATTERN = /^UPG\d{6}$/;

// NIHC is historical only — a game can't be scheduled in it.
export const UpcomingGameTypeSchema = GameTypeSchema.extract(
  ["CHALLENGE", "LLIHC", "BOTBC"],
  { error: "Select a competition" },
);
export type UpcomingGameType = z.infer<typeof UpcomingGameTypeSchema>;

// Date and time are UK wall-clock strings, not a Date: the published file
// wants exactly "YYYY-MM-DD" plus a local time, and storing an instant would
// mean converting through BST/GMT on the way in and out (design D1). Both
// forms also sort correctly as plain strings.
function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const DateStringSchema = z
  .string({ error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required")
  .refine(isRealCalendarDate, "Enter a real date");

const TimeStringSchema = z
  .string({ error: "Time is required" })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time between 00:00 and 23:59");

const UpcomingGameShape = z.object({
  _id: z.string().regex(UPCOMING_GAME_ID_PATTERN), // "UPG######"
  opponentId: z
    .string({ error: "Select an opponent" })
    .regex(OPPONENT_ID_PATTERN, "Select an opponent"),
  date: DateStringSchema,
  time: TimeStringSchema,
  location: z.enum(["HOME", "AWAY"], { error: "Select home or away" }),
  // Only away games carry a venue — the home rink is a single constant
  // applied at publish time (lib/publish/artifacts/upcoming-games.ts).
  venue: z.string().trim().optional(),
  type: UpcomingGameTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

type VenueFields = { location: "HOME" | "AWAY"; venue?: string };

function checkVenue(game: VenueFields, ctx: z.RefinementCtx) {
  if (game.location === "AWAY" && !game.venue) {
    ctx.addIssue({
      code: "custom",
      message: "Venue is required for away games",
      path: ["venue"],
    });
  }
  if (game.location === "HOME" && game.venue !== undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Home games don't take a venue",
      path: ["venue"],
    });
  }
}

export const UpcomingGameSchema = UpcomingGameShape.superRefine(checkVenue);
export type UpcomingGame = z.infer<typeof UpcomingGameSchema>;

export const UpcomingGameCreateInputSchema = UpcomingGameShape.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
}).superRefine(checkVenue);
export type UpcomingGameCreateInput = z.infer<
  typeof UpcomingGameCreateInputSchema
>;
