import type { Opponent, UpcomingGame } from "../../schemas";
import { formatTime12h } from "../../upcoming-games/time";
import { competitionLabel } from "./competition";

// Home games don't store a venue — this is the one place the home rink is
// named (add-upcoming-games design D1).
export const HOME_VENUE = "Planet Ice Peterborough";

export interface UpcomingGameArtifact {
  opponentTeam: string;
  logoImage: string;
  gameType: string;
  date: string;
  time: string;
  location: string;
}

// upcoming-games.json (fixtures/golden/README.md). Only games dated `today`
// or later are published, soonest first. The opponent is enriched at
// generation time like results.json: its current name, and its logo's S3 key
// as `logoImage` — "" rather than omitted when it has none, since the legacy
// file always carries the key.
export function generateUpcomingGamesArtifact(
  upcomingGames: UpcomingGame[],
  opponents: Opponent[],
  today: string,
): UpcomingGameArtifact[] {
  const opponentById = new Map(opponents.map((opponent) => [opponent._id, opponent]));

  return upcomingGames
    .filter((game) => game.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map((game) => {
      const opponent = opponentById.get(game.opponentId);
      if (!opponent) {
        // Same reasoning as results.json: fail the whole generation rather
        // than publish an entry with no opponent.
        throw new Error(
          `Upcoming game ${game._id} references opponent ${game.opponentId}, which does not exist`,
        );
      }

      return {
        opponentTeam: opponent.name,
        logoImage: opponent.logo?.key ?? "",
        gameType: competitionLabel(game.type),
        date: game.date,
        time: formatTime12h(game.time),
        location: game.location === "HOME" ? HOME_VENUE : (game.venue ?? ""),
      };
    });
}
