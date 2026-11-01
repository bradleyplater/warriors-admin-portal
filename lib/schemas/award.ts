import { z } from "zod";

// The recurring awards, in display order. Keys are stable across seasons so
// the website's roll of honour can line up the same award year on year;
// names are what's shown. One-off club awards aren't listed here — they're
// typed onto their evening as a customName.
export const AWARD_CATEGORIES = {
  mvp: { name: "Most valuable player", group: "Most valuable player" },
  captain: { name: "Captain", group: "Honours" },
  "alternate-captain": { name: "Alternate captain", group: "Honours" },
  "players-player": { name: "Players’ player of the year", group: "Honours" },
  "coaches-player": { name: "Coaches’ player of the year", group: "Honours" },
  "managers-player": { name: "Manager’s player of the year", group: "Honours" },
  "most-goals": { name: "Most goals", group: "Performance", stat: "goals" },
  "most-assists": {
    name: "Most assists",
    group: "Performance",
    stat: "assists",
  },
  "most-points": { name: "Most points", group: "Performance", stat: "points" },
  "consistent-forward": {
    name: "Most consistent forward",
    group: "Performance",
  },
  "consistent-defender": {
    name: "Most consistent defender",
    group: "Performance",
  },
  "best-goalie": { name: "Best goalie", group: "Performance" },
  "improved-player": { name: "Most improved player", group: "Most improved" },
  "improved-skating": { name: "Most improved skating", group: "Most improved" },
  "improved-stickhandling": {
    name: "Most improved stickhandling",
    group: "Most improved",
  },
  "improved-shooting": {
    name: "Most improved shooting",
    group: "Most improved",
  },
} as const satisfies Record<
  string,
  { name: string; group: string; stat?: "goals" | "assists" | "points" }
>;

export type AwardCategory = keyof typeof AWARD_CATEGORIES;

export const AwardCategorySchema = z.enum(
  Object.keys(AWARD_CATEGORIES) as [AwardCategory, ...AwardCategory[]],
);

// The competitions an award can be split by. Absent on an entry means the
// award covers the whole club — every pre-split season, and the coaches' and
// manager's honours since.
export const AwardCompetitionSchema = z.enum(["BOTBC", "LLIHC"]);
export type AwardCompetition = z.infer<typeof AwardCompetitionSchema>;

// draft: nothing published. categories: the evening is published with every
// winner shown as "To be announced". announced: winners are published.
export const AwardEveningStatusSchema = z.enum([
  "draft",
  "categories",
  "announced",
]);
export type AwardEveningStatus = z.infer<typeof AwardEveningStatusSchema>;
export const AWARD_EVENING_STATUSES = AwardEveningStatusSchema.options;

export const MAX_AWARD_TEXT_LENGTH = 120;

const AwardTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    MAX_AWARD_TEXT_LENGTH,
    `Must be ${MAX_AWARD_TEXT_LENGTH} characters or fewer`,
  );

// A photo from the night for this award only — never the player's own
// photo. Stored as the processed WebP, like game photos, so the key alone
// says what the file is.
export const AwardPhotoSchema = z.object({
  key: z.string(),
  alt: AwardTextSchema.optional(),
});
export type AwardPhoto = z.infer<typeof AwardPhotoSchema>;

const AwardEntryShape = z.object({
  _id: z.string(), // "AWD######"
  category: AwardCategorySchema.optional(),
  customName: AwardTextSchema.optional(),
  competition: AwardCompetitionSchema.optional(),
  // Player ids. Empty while the winner is still to be announced; more than
  // one for a shared award. Whether each id exists needs the DB, so that's
  // checked by the server actions, not here.
  winners: z.array(z.string()),
  photo: AwardPhotoSchema.optional(),
  // Shown under the winner in the roll of honour, e.g. "Named for 2023/24".
  note: AwardTextSchema.optional(),
  // Most goals/assists/points only: leave the winners' totals off the
  // website, e.g. where today's game records no longer match what was
  // awarded on the night. Absent means shown; never stored as false.
  hideTotal: z.literal(true).optional(),
});

export const AwardEntrySchema = AwardEntryShape.superRefine((entry, ctx) => {
  if ((entry.category === undefined) === (entry.customName === undefined)) {
    ctx.addIssue({
      code: "custom",
      message: "An award needs either a category or a custom name, not both",
      path: ["category"],
    });
  }
  if (new Set(entry.winners).size !== entry.winners.length) {
    ctx.addIssue({
      code: "custom",
      message: "A player can only be listed once as a winner",
      path: ["winners"],
    });
  }
});
export type AwardEntry = z.infer<typeof AwardEntryShape>;

const EVENING_ID_PATTERN = /^EVE\d{4}$/;
const PHOTO_NAME = /^[A-Za-z0-9-]+\.webp$/;

// Evening ids are derived from their season ("SSN2526" -> "EVE2526"), so a
// season can only ever have one awards evening.
export function eveningIdForSeason(seasonId: string): string {
  return `EVE${seasonId.slice(3)}`;
}

const AwardEveningShape = z.object({
  _id: z
    .string()
    .regex(
      EVENING_ID_PATTERN,
      'Evening id must be "EVE" followed by 4 digits (e.g. "EVE2526")',
    ),
  seasonId: z.string(),
  status: AwardEveningStatusSchema,
  // Display order is array order.
  entries: z.array(AwardEntrySchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

function checkEvening(
  evening: z.infer<typeof AwardEveningShape>,
  ctx: z.RefinementCtx,
) {
  if (eveningIdForSeason(evening.seasonId) !== evening._id) {
    ctx.addIssue({
      code: "custom",
      message:
        'Evening id and season must refer to the same season (e.g. "EVE2526" with "SSN2526")',
      path: ["seasonId"],
    });
  }

  const seen = new Set<string>();
  evening.entries.forEach((entry, index) => {
    if (seen.has(entry._id)) {
      ctx.addIssue({
        code: "custom",
        message: "Award entries cannot repeat the same id",
        path: ["entries", index, "_id"],
      });
    }
    seen.add(entry._id);

    // A key under another entry's prefix would publish that award's photo
    // here.
    const prefix = `awards/${evening._id}/${entry._id}/`;
    if (
      entry.photo &&
      (!entry.photo.key.startsWith(prefix) ||
        !PHOTO_NAME.test(entry.photo.key.slice(prefix.length)))
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Photo key must be a .webp file under ${prefix}`,
        path: ["entries", index, "photo", "key"],
      });
    }
  });
}

export const AwardEveningSchema = AwardEveningShape.superRefine(checkEvening);
export type AwardEvening = z.infer<typeof AwardEveningShape>;
