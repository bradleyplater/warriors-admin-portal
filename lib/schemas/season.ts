import { z } from "zod";

const SEASON_ID_PATTERN = /^SSN\d{4}$/;
const SEASON_NAME_PATTERN = /^\d{2}\/\d{2}$/;

const SeasonShape = z.object({
  _id: z
    .string()
    .regex(
      SEASON_ID_PATTERN,
      'Season id must be "SSN" followed by 4 digits (e.g. "SSN2526")',
    ),
  name: z
    .string()
    .regex(
      SEASON_NAME_PATTERN,
      'Season name must match "##/##" (e.g. "25/26")',
    ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SeasonSchema = SeasonShape.refine(
  (season) => {
    if (
      !SEASON_ID_PATTERN.test(season._id) ||
      !SEASON_NAME_PATTERN.test(season.name)
    ) {
      // Format is already reported by the field-level regex checks above;
      // skip the cross-field check so one bad field doesn't also fail here.
      return true;
    }
    return season._id.slice(3) === season.name.replace("/", "");
  },
  {
    message:
      'Season id and name must refer to the same season (e.g. "SSN2526" with "25/26")',
    path: ["name"],
  },
);
export type Season = z.infer<typeof SeasonSchema>;

export const SeasonCreateInputSchema = SeasonShape.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export type SeasonCreateInput = z.infer<typeof SeasonCreateInputSchema>;
