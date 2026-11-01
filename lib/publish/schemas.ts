import { z } from "zod";

// Shapes of the website JSON contract, as captured in fixtures/golden/ (see
// fixtures/golden/README.md). Each schema doubles as the drift detector: it
// validates both the frozen golden fixture files (lib/publish/schemas.test.ts)
// and this generator's own output (lib/publish/artifacts/*.test.ts) — the
// same contract, checked from both directions.
//
// awards.json is deliberately not covered here — nothing generates it yet
// (see docs/02-architecture.md's publish pipeline section for why).

const PlayerSeasonStatsArtifactSchema = z.object({
  season: z.string(),
  games: z.number().int(),
  goals: z.number().int(),
  assists: z.number().int(),
  pims: z.number().int(),
  points: z.number().int(),
  warriorOfTheGame: z.number().int().optional(),
  manOfTheMatch: z.number().int().optional(),
});

const PlayerArtifactSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().optional(),
  // Absent for an inactive player without a number; the golden fixture
  // predates any such player.
  number: z.number().int().optional(),
  position: z.string(),
  stats: z.array(PlayerSeasonStatsArtifactSchema),
});

export const PlayersArtifactSchema = z.array(PlayerArtifactSchema);

export const RosterConfigArtifactSchema = z.object({
  activePlayers: z.array(z.string()),
});

const TeamSeasonStatsArtifactSchema = z.object({
  season: z.string(),
  games: z.number().int(),
  goalsFor: z.number().int(),
  pims: z.number().int(),
  goalsAgainst: z.number().int(),
  wins: z.number().int(),
  draws: z.number().int(),
  losses: z.number().int(),
});

export const TeamArtifactSchema = z.object({
  stats: z.array(TeamSeasonStatsArtifactSchema),
});

const ResultGoalArtifactSchema = z.object({
  playerId: z.string(),
  // The legacy fixture pads unused assist slots with literal `null` entries
  // (always on opponentGoals, which never tracked assists at all) rather
  // than omitting them — accepted here so the fixture itself validates; our
  // generator never emits null, only a shorter array.
  assists: z.array(z.string().nullable()),
  minute: z.number().int(),
  second: z.number().int(),
  type: z.string(),
});

const ResultPenaltyArtifactSchema = z.object({
  offender: z.string(),
  minute: z.number().int(),
  second: z.number().int(),
  type: z.string(),
  duration: z.number(),
});

const ResultPeriodArtifactSchema = z.object({
  warriorsScore: z.number().int(),
  opponentScore: z.number().int(),
  goals: z.array(ResultGoalArtifactSchema),
  opponentGoals: z.array(ResultGoalArtifactSchema),
  penalties: z.array(ResultPenaltyArtifactSchema),
  opponentPenalties: z.array(ResultPenaltyArtifactSchema),
});

const ResultArtifactSchema = z.object({
  season: z.string(),
  opponentTeam: z.string(),
  // The opponent logo's S3 key, enriched from the Opponent collection at
  // generation time (add-opponents). Optional because opponents without a
  // logo omit it; the legacy golden fixture has a bare filename here.
  logoImage: z.string().optional(),
  date: z.string(),
  seasonId: z.string(),
  roster: z.array(z.string()),
  // "MISSING" is the legacy sentinel for a genuinely unset award/netminder —
  // preserved deliberately, see lib/publish/artifacts/results.ts.
  manOfTheMatchPlayerId: z.string(),
  warriorOfTheGamePlayerId: z.string(),
  netminderPlayerId: z.string(),
  competition: z.string(),
  location: z.string(),
  score: z.object({
    warriorsScore: z.number().int(),
    opponentScore: z.number().int(),
    period: z.object({
      one: ResultPeriodArtifactSchema,
      two: ResultPeriodArtifactSchema,
      three: ResultPeriodArtifactSchema,
    }),
    // Only present when shootout goals were recorded; the legacy fixture
    // never had it.
    shootout: z
      .object({
        warriorsScore: z.number().int(),
        opponentScore: z.number().int(),
        goals: z.array(ResultGoalArtifactSchema),
        opponentGoals: z.array(ResultGoalArtifactSchema),
      })
      .optional(),
  }),
  // The game's photos in display order (add-game-photos design D8): each an
  // S3 key the website resolves against the CDN, like logoImage. Omitted
  // when the game has none; the legacy fixture never had it.
  photos: z
    .array(
      z.object({
        key: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
      }),
    )
    .optional(),
});

export const ResultsArtifactSchema = z.array(ResultArtifactSchema);

const UpcomingGameArtifactSchema = z.object({
  opponentTeam: z.string(),
  // The opponent logo's S3 key, or "" when it has none; the legacy golden
  // fixture has a bare filename here.
  logoImage: z.string(),
  // A plain string, not the portal's enum: the legacy fixture says "BOTB"
  // where the portal emits "BOTBC" (the same label results.json uses).
  gameType: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/),
  location: z.string(),
});

export const UpcomingGamesArtifactSchema = z.array(UpcomingGameArtifactSchema);

// seasons.json is new with the active-season change, so there's no golden
// fixture for it — only the generator's own tests check it.
export const SeasonsArtifactSchema = z.object({
  activeSeason: z.string().nullable(),
  seasons: z.array(z.string()),
});

// awards.json is new with add-awards. The legacy file in fixtures/golden is
// the hand-written one the import read, not this contract — the website
// moves to this shape when its awards page is rebuilt.
const AwardWinnerArtifactSchema = z.object({
  playerId: z.string(),
  // Most goals/assists/points only: the winner's total in the award's games.
  total: z.number().int().nonnegative().optional(),
});

const AwardArtifactSchema = z.object({
  // Absent for a one-off club award.
  category: z.string().optional(),
  name: z.string(),
  group: z.string(),
  // "BOTB" or "LLIHC"; absent for a club-wide award.
  competition: z.string().optional(),
  stat: z.enum(["goals", "assists", "points"]).optional(),
  // Empty until announced.
  winners: z.array(AwardWinnerArtifactSchema),
  // CDN key, like results.json's photos.
  photo: z.object({ key: z.string(), alt: z.string() }).optional(),
  note: z.string().optional(),
});

export const AwardsArtifactSchema = z.object({
  competitions: z.array(z.string()),
  // The recurring awards in display order, for the roll of honour.
  categories: z.array(
    z.object({ key: z.string(), name: z.string(), group: z.string() }),
  ),
  // Oldest first.
  evenings: z.array(
    z.object({
      season: z.string(),
      // 1 for the first awards evening, 2 for the second...
      number: z.number().int().positive(),
      status: z.enum(["categories", "announced"]),
      awards: z.array(AwardArtifactSchema),
    }),
  ),
});
