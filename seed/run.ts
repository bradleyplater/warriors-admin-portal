import { getDb } from "../lib/mongodb";
import { ensureIndexes } from "../lib/repositories";
import type { Season, Team, Player, Game } from "./types";
import { seasons } from "./data/seasons";
import { team } from "./data/team";
import { players } from "./data/players";
import { games } from "./data/games";

export async function runSeed(): Promise<void> {
  const db = await getDb();

  // Unconditional and idempotent — must run whether or not fixtures get
  // inserted below, since this is also how the future production migration
  // establishes the same indexes (see data-access-layer design.md).
  await ensureIndexes(db);

  const seasonsCollection = db.collection<Season>("seasons");
  const teamCollection = db.collection<Team>("team");
  const playersCollection = db.collection<Player>("players");
  const gamesCollection = db.collection<Game>("games");

  const [seasonCount, teamCount, playerCount, gameCount] = await Promise.all([
    seasonsCollection.countDocuments(),
    teamCollection.countDocuments(),
    playersCollection.countDocuments(),
    gamesCollection.countDocuments(),
  ]);

  if (seasonCount > 0 || teamCount > 0 || playerCount > 0 || gameCount > 0) {
    console.log(
      "Seed skipped: one or more of seasons/team/players/games already has documents.",
    );
    return;
  }

  await Promise.all([
    seasonsCollection.insertMany(seasons),
    teamCollection.insertOne(team),
    playersCollection.insertMany(players),
    gamesCollection.insertMany(games),
  ]);

  console.log(
    `Seeded ${seasons.length} seasons, 1 team, ${players.length} players, ${games.length} games.`,
  );
}
