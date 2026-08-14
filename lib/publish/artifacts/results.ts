import type { Game, GameType, Season } from "../../schemas";
import { deriveResultsScore, type ResultsScore } from "../../derived/game-periods";

export interface ResultArtifact {
  season: string;
  opponentTeam: string;
  date: string;
  seasonId: string;
  roster: string[];
  manOfTheMatchPlayerId: string;
  warriorOfTheGamePlayerId: string;
  netminderPlayerId: string;
  competition: string;
  location: string;
  score: ResultsScore;
}

// Legacy sentinel for a genuinely unset award/netminder field — see
// fixtures/golden/results.json. These fields are optional on Game, so a
// real (post-migration) game can legitimately have none of them set yet.
const MISSING = "MISSING";

// The legacy contract renders GameType "CHALLENGE" as "Challenge"; every
// other type (BOTBC, LLIHC, NIHC) passes through unchanged.
const COMPETITION_LABELS: Partial<Record<GameType, string>> = {
  CHALLENGE: "Challenge",
};

function competitionLabel(type: GameType): string {
  return COMPETITION_LABELS[type] ?? type;
}

// results.json (fixtures/golden/README.md). `logoImage` is deliberately not
// emitted — no opponent-logo data source exists yet (deferred, see the
// KAN-30 plan). `season`/`seasonId` both resolve to the season's *name*
// ("24/25"), matching the legacy fixture, not the internal SSN#### id.
export function generateResultsArtifact(games: Game[], seasons: Season[]): ResultArtifact[] {
  const seasonNameById = new Map(seasons.map((season) => [season._id, season.name]));

  return [...games]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((game) => {
      const seasonName = seasonNameById.get(game.seasonId) ?? game.seasonId;
      const score = deriveResultsScore(
        game.team.goals,
        game.opponentTeam.goals,
        game.team.penalties,
        game.opponentTeam.penalties,
      );

      return {
        season: seasonName,
        opponentTeam: game.opponentTeam.name,
        date: game.date.toISOString(),
        seasonId: seasonName,
        roster: game.team.roster.map((entry) => entry.playerId),
        manOfTheMatchPlayerId: game.manOfTheMatchPlayerId ?? MISSING,
        warriorOfTheGamePlayerId: game.warriorOfTheGamePlayerId ?? MISSING,
        netminderPlayerId: game.netminderPlayerId ?? MISSING,
        competition: competitionLabel(game.type),
        location: game.location,
        score,
      };
    });
}
