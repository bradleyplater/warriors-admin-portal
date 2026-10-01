import { getDb } from "../lib/mongodb";
import { ensureIndexes } from "../lib/repositories";
import { COLLECTION_NAMES } from "../lib/repositories/internal/collections";
import type { Season, Team, Player, Game, Opponent, UpcomingGame } from "./types";
import { seasons } from "./data/seasons";
import { team } from "./data/team";
import { players } from "./data/players";
import { games } from "./data/games";
import { opponents } from "./data/opponents";
import { upcomingGames } from "./data/upcoming-games";

export async function runSeed(): Promise<void> {
  const db = await getDb();

  // Unconditional and idempotent — must run whether or not fixtures get
  // inserted below, since this is also how the future production migration
  // establishes the same indexes (see data-access-layer design.md).
  await ensureIndexes(db);

  const seasonsCollection = db.collection<Season>(COLLECTION_NAMES.seasons);
  const teamCollection = db.collection<Team>(COLLECTION_NAMES.team);
  const playersCollection = db.collection<Player>(COLLECTION_NAMES.player);
  const gamesCollection = db.collection<Game>(COLLECTION_NAMES.game);
  const opponentsCollection = db.collection<Opponent>(COLLECTION_NAMES.opponent);
  const upcomingGamesCollection = db.collection<UpcomingGame>(
    COLLECTION_NAMES.upcomingGame,
  );

  const counts = await Promise.all([
    seasonsCollection.countDocuments(),
    teamCollection.countDocuments(),
    playersCollection.countDocuments(),
    gamesCollection.countDocuments(),
    opponentsCollection.countDocuments(),
    upcomingGamesCollection.countDocuments(),
  ]);

  if (counts.some((count) => count > 0)) {
    console.log(
      "Seed skipped: one or more of seasons/team/players/games/opponents/upcoming games already has documents.",
    );
    return;
  }

  await Promise.all([
    seasonsCollection.insertMany(seasons),
    teamCollection.insertOne(team),
    playersCollection.insertMany(players),
    gamesCollection.insertMany(games),
    opponentsCollection.insertMany(opponents),
    upcomingGamesCollection.insertMany(upcomingGames),
  ]);

  console.log(
    `Seeded ${seasons.length} seasons, 1 team, ${players.length} players, ${games.length} games, ${opponents.length} opponents, ${upcomingGames.length} upcoming games.`,
  );
}
