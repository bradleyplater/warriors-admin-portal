import { z } from "zod";
import { PositionSchema } from "./enums";

const PlayerShape = z.object({
  _id: z.string(), // "PLR######"
  firstName: z.string().min(1),
  surname: z.string().min(1),
  // Range only. Uniqueness among active players is enforced by the DB's
  // unique partial index on { number: 1 } where active: true (KAN-14) —
  // it needs every other active player's document, not just this one.
  number: z
    .number({ error: "Number must be between 1 and 99" })
    .int("Number must be between 1 and 99")
    .min(1, "Number must be between 1 and 99")
    .max(99, "Number must be between 1 and 99"),
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

export const PlayerSchema = PlayerShape;
export type Player = z.infer<typeof PlayerSchema>;

export const PlayerCreateInputSchema = PlayerShape.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export type PlayerCreateInput = z.infer<typeof PlayerCreateInputSchema>;
