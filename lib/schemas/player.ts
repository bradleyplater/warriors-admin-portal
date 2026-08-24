import { z } from "zod";
import { PositionSchema } from "./enums";

// Base "this is a genuinely numeric integer" check, shared by the field
// below and by ShirtNumberSchema's stricter range — so a non-numeric value
// (e.g. Number("abc") => NaN) gets the same friendly message regardless of
// whether the 1-99 range check ever runs.
const IntegerSchema = z
  .number({ error: "Number must be between 1 and 99" })
  .int("Number must be between 1 and 99");

// Exported separately from PlayerShape so a single value can be validated
// against the 1-99 range in isolation (e.g. the D9 migration review's
// single-field form) without needing a whole Player document — whether a
// number is *required at all* is a document-level rule (see the refine
// below), not something this field schema alone can decide.
export const ShirtNumberSchema = IntegerSchema.min(
  1,
  "Number must be between 1 and 99",
).max(99, "Number must be between 1 and 99");

const PlayerShape = z.object({
  _id: z.string(), // "PLR######"
  firstName: z.string().min(1),
  surname: z.string().min(1),
  // Only checked to be an integer at the field level — the 1-99 range (via
  // ShirtNumberSchema) and presence are enforced only for ACTIVE players,
  // by the requireNumberWhenActive refine below. An inactive player doesn't
  // need a valid (or any) number at all (D9, KAN-36): they don't play, so
  // their stale/legacy value, if any (possibly out of range), is left as
  // whatever it is. Uniqueness among active players is separately enforced
  // by the DB's unique partial index on { number: 1 } where active: true
  // (KAN-14) — it needs every other active player's document, not just
  // this one.
  number: IntegerSchema.optional(),
  positions: z
    .array(PositionSchema)
    .min(1, "At least one position is required"),
  active: z.boolean(),
  nickname: z.string().min(1).optional(),
  // Bare S3 object key/filename (e.g. "plr100010.jpg"), not a full URL —
  // keeps stored documents portable across environments with different
  // S3 hosts/buckets (local MinIO vs prod).
  imagePath: z.string().min(1).optional(),
  teamId: z.string(), // "TM######"
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Applies ShirtNumberSchema's full 1-99 range (and presence) only for
// active players — reusing it here rather than duplicating the range check
// keeps "1-99" defined in exactly one place.
function requireNumberWhenActive<
  Schema extends z.ZodType<{ active: boolean; number?: number }>,
>(schema: Schema) {
  return schema.superRefine((data, ctx) => {
    if (!data.active) return;
    const result = ShirtNumberSchema.safeParse(data.number);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: result.error.issues[0]?.message ?? "Number must be between 1 and 99",
        path: ["number"],
      });
    }
  });
}

export const PlayerSchema = requireNumberWhenActive(PlayerShape);
export type Player = z.infer<typeof PlayerShape>;

const PlayerCreateInputShape = PlayerShape.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export const PlayerCreateInputSchema = requireNumberWhenActive(
  PlayerCreateInputShape,
);
export type PlayerCreateInput = z.infer<typeof PlayerCreateInputShape>;
