import { z } from "zod";

// Identity only — players[] and stats[] are derived, not stored (see
// docs/03-data-model.md's "Team — slimmed to identity only").
const TeamShape = z.object({
  _id: z.string(), // "TM######"
  name: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TeamSchema = TeamShape;
export type Team = z.infer<typeof TeamSchema>;

export const TeamCreateInputSchema = TeamShape.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export type TeamCreateInput = z.infer<typeof TeamCreateInputSchema>;
