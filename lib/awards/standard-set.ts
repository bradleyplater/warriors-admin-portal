import type { AwardCategory, AwardCompetition } from "../schemas";
import type { AwardEntryInput } from "../repositories";

// The awards evening as the 2025/26 design lays it out: these awards once
// for each competition...
const PER_COMPETITION: AwardCategory[] = [
  "mvp",
  "players-player",
  "most-goals",
  "most-assists",
  "most-points",
  "consistent-forward",
  "consistent-defender",
  "improved-player",
  "improved-skating",
  "improved-stickhandling",
  "improved-shooting",
];

// ...and these once for the whole club.
const CLUB_WIDE: AwardCategory[] = ["coaches-player", "managers-player"];

const COMPETITIONS: AwardCompetition[] = ["BOTBC", "LLIHC"];

// A starting point for a new evening, every winner still to be decided.
// One-off club awards are added by hand.
export function standardAwardEntries(): AwardEntryInput[] {
  return [
    ...PER_COMPETITION.flatMap((category) =>
      COMPETITIONS.map((competition) => ({
        category,
        competition,
        winners: [],
      })),
    ),
    ...CLUB_WIDE.map((category) => ({ category, winners: [] })),
  ];
}
