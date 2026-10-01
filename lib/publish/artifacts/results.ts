import type { Game, Opponent, Season } from "../../schemas";
import { competitionLabel } from "./competition";
import { deriveResultsScore, type ResultsScore } from "../../derived/game-periods";

export interface ResultArtifact {
  season: string;
  opponentTeam: string;
  logoImage?: string;
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

// results.json (fixtures/golden/README.md). `season`/`seasonId` both
// resolve to the season's *name* ("24/25"), matching the legacy fixture, not
// the internal SSN#### id. The opponent is enriched from the Opponent
// collection at generation time (add-opponents design D8): its current name,
// plus `logoImage` as the logo's S3 key — omitted when it has no logo. That
// key replaces the legacy bare filename, so the website must resolve it
// against the CDN rather than its own images folder.
export function generateResultsArtifact(
  games: Game[],
  seasons: Season[],
  opponents: Opponent[],
): ResultArtifact[] {
  const seasonNameById = new Map(seasons.map((season) => [season._id, season.name]));
  const opponentById = new Map(opponents.map((opponent) => [opponent._id, opponent]));

  return [...games]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((game) => {
      const seasonName = seasonNameById.get(game.seasonId) ?? game.seasonId;
      const opponent = opponentById.get(game.opponentTeam.opponentId);
      if (!opponent) {
        // Publishing an entry with no opponent name would silently break the
        // website's results page — fail the whole generation instead.
        throw new Error(
          `Game ${game._id} references opponent ${game.opponentTeam.opponentId}, which does not exist`,
        );
      }
      const score = deriveResultsScore(
        game.team.goals,
        game.opponentTeam.goals,
        game.team.penalties,
        game.opponentTeam.penalties,
      );

      return {
        season: seasonName,
        opponentTeam: opponent.name,
        ...(opponent.logo && { logoImage: opponent.logo.key }),
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
