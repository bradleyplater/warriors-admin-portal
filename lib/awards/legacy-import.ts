import type { AwardCategory } from "../schemas";
import type { AwardEntryInput } from "../repositories";

// One evening as the website's hand-written public/data/awards.json had it.
export interface LegacyAwardEvening {
  id: string;
  title: string;
  season: string; // "24/25"
  images: string[];
  awards: {
    tier: number;
    category: string;
    winner: string;
    playerId: string | null;
  }[];
}

export interface MappedAwardEvening {
  seasonId: string;
  entries: AwardEntryInput[];
}

// Every legacy category name that maps onto a recurring award. Anything not
// listed is a one-off club award and keeps its name as a customName.
const LEGACY_CATEGORIES: Record<
  string,
  { category: AwardCategory; note?: string }
> = {
  MVP: { category: "mvp" },
  Captain: { category: "captain" },
  "Captain for 2023/24 Season": {
    category: "captain",
    note: "Named for 2023/24",
  },
  "Alternate Captain": { category: "alternate-captain" },
  "Captain Assistant for 2023/24 Season": {
    category: "alternate-captain",
    note: "Named for 2023/24",
  },
  "Players Player": { category: "players-player" },
  "Coaches Player of the Year": { category: "coaches-player" },
  "Managers Player of the Year": { category: "managers-player" },
  "Most Goals of the Year": { category: "most-goals" },
  "Most Assists of the Year": { category: "most-assists" },
  "Most Points of the Year": { category: "most-points" },
  "Most Consistent Forward": { category: "consistent-forward" },
  "Most Consistent Defender": { category: "consistent-defender" },
  "Most Consistent Defenceman": { category: "consistent-defender" },
  "Best Goalie": { category: "best-goalie" },
  "Most Improved Player": { category: "improved-player" },
  "Most Improved Skating": { category: "improved-skating" },
  "Most Improved Skater": { category: "improved-skating" },
  "Most Improved Stickhandling": { category: "improved-stickhandling" },
  "Most Improved Shooting": { category: "improved-shooting" },
};

// Winners the legacy file has no playerId for, by the name it shows.
// "Darren Wolf" is Darren Almond; the "&" entry was a shared award.
const LEGACY_WINNER_IDS: Record<string, string[]> = {
  "Darren Wolf": ["PLR143854"],
  "Rhys Evans & Charles Loew": ["PLR006500", "PLR760594"],
};

// Holders of these are separate people in the same role, not a shared award,
// so each keeps its own entry.
const NEVER_SHARED: ReadonlySet<AwardCategory> = new Set(["alternate-captain"]);

export class UnmappedLegacyWinnerError extends Error {
  constructor(season: string, category: string, winner: string) {
    super(`${season} "${category}": no player id for "${winner}"`);
    this.name = "UnmappedLegacyWinnerError";
  }
}

export function seasonIdFromName(name: string): string {
  return `SSN${name.replace("/", "")}`;
}

// Legacy evenings were before the BOTB/LLIHC split, so no entry gets a
// competition. Repeated rows for the same award become one entry with
// several winners, in the order they were listed.
export function mapLegacyEvening(
  legacy: LegacyAwardEvening,
): MappedAwardEvening {
  const entries: AwardEntryInput[] = [];

  for (const award of legacy.awards) {
    const winnerIds = award.playerId
      ? [award.playerId]
      : LEGACY_WINNER_IDS[award.winner];
    if (!winnerIds) {
      throw new UnmappedLegacyWinnerError(
        legacy.season,
        award.category,
        award.winner,
      );
    }
    // A copy: merging a shared award pushes onto it.
    const winners = [...winnerIds];

    const known = LEGACY_CATEGORIES[award.category];
    const details: AwardEntryInput = known
      ? {
          category: known.category,
          winners,
          ...(known.note && { note: known.note }),
        }
      : { customName: award.category, winners };

    const shared =
      known &&
      !NEVER_SHARED.has(known.category) &&
      entries.find((entry) => entry.category === known.category);
    if (shared) {
      shared.winners.push(
        ...winners.filter((id) => !shared.winners.includes(id)),
      );
    } else {
      entries.push(details);
    }
  }

  return { seasonId: seasonIdFromName(legacy.season), entries };
}

export type ImportPlan =
  | { seasonId: string; action: "create"; entries: AwardEntryInput[] }
  | { seasonId: string; action: "skip"; reason: string };

// Decides what the import would do with each evening, without touching the
// database: an evening already imported is skipped (so re-running is safe),
// and one whose season or winners don't exist is skipped with the reason.
export function planLegacyImport(
  mapped: MappedAwardEvening[],
  existing: {
    seasonIds: ReadonlySet<string>;
    playerIds: ReadonlySet<string>;
    eveningSeasonIds: ReadonlySet<string>;
  },
): ImportPlan[] {
  return mapped.map(({ seasonId, entries }) => {
    if (existing.eveningSeasonIds.has(seasonId)) {
      return { seasonId, action: "skip", reason: "already imported" };
    }
    if (!existing.seasonIds.has(seasonId)) {
      return { seasonId, action: "skip", reason: "season does not exist" };
    }
    const missing = [
      ...new Set(
        entries
          .flatMap((entry) => entry.winners)
          .filter((id) => !existing.playerIds.has(id)),
      ),
    ];
    if (missing.length > 0) {
      return {
        seasonId,
        action: "skip",
        reason: `unknown players: ${missing.join(", ")}`,
      };
    }
    return { seasonId, action: "create", entries };
  });
}
