import { getDb } from "../../mongodb";
import { listGames, listSeasons } from "../../repositories";
import type { Game, Season } from "../../schemas";

export interface ActiveReviewPlayer {
  playerId: string;
  firstName: string;
  surname: string;
  number: number | null;
  active: boolean | undefined;
  playedCurrentSeason: boolean;
}

// Season ids are the fixed-width "SSN####" format (see lib/schemas/season.ts),
// so the lexicographically-highest id is also the most recent season — no
// separate "current season" concept exists anywhere else in the app yet.
export function selectCurrentSeasonId(seasons: Season[]): string | null {
  if (seasons.length === 0) {
    return null;
  }
  return seasons.reduce((latest, season) =>
    season._id > latest._id ? season : latest,
  )._id;
}

export function computePlayedCurrentSeasonPlayerIds(
  games: Game[],
  currentSeasonId: string | null,
): Set<string> {
  const playerIds = new Set<string>();
  if (currentSeasonId === null) {
    return playerIds;
  }
  for (const game of games) {
    if (game.seasonId !== currentSeasonId) {
      continue;
    }
    for (const entry of game.team.roster) {
      playerIds.add(entry.playerId);
    }
  }
  return playerIds;
}

// Migration Plan Step 2 (docs/04-migration-plan.md): players who played in
// the current season are listed first as a hint — it's only a hint, not
// authoritative, hence the D8 manual review this list feeds. Ties fall back
// to shirt number (missing numbers sort last), then surname.
export function sortActiveReviewPlayers(
  players: ActiveReviewPlayer[],
): ActiveReviewPlayer[] {
  return [...players].sort((a, b) => {
    if (a.playedCurrentSeason !== b.playedCurrentSeason) {
      return a.playedCurrentSeason ? -1 : 1;
    }
    if (a.number !== b.number) {
      if (a.number === null) return 1;
      if (b.number === null) return -1;
      return a.number - b.number;
    }
    return a.surname.localeCompare(b.surname);
  });
}

interface RawPlayerDoc {
  _id: string;
  firstName?: unknown;
  surname?: unknown;
  number?: unknown;
  active?: unknown;
}

// Reads players via the raw driver rather than the players repository's
// listPlayers(), which validates every document against PlayerSchema —
// `active` is a required field there, but real production player docs have
// no `active` at all until this D8 review sets it (Migration Plan Step 1,
// KAN-34, deliberately never touches it). This is the one read path in the
// app that must tolerate that gap.
export async function listPlayersForActiveReview(): Promise<
  ActiveReviewPlayer[]
> {
  const [db, seasons, games] = await Promise.all([
    getDb(),
    listSeasons(),
    listGames(),
  ]);
  const docs = await db
    .collection<RawPlayerDoc>("players")
    .find({})
    .toArray();

  const currentSeasonId = selectCurrentSeasonId(seasons);
  const playedCurrentSeasonIds = computePlayedCurrentSeasonPlayerIds(
    games,
    currentSeasonId,
  );

  const players: ActiveReviewPlayer[] = docs.map((doc) => ({
    playerId: doc._id,
    firstName: typeof doc.firstName === "string" ? doc.firstName : "",
    surname: typeof doc.surname === "string" ? doc.surname : "",
    number: typeof doc.number === "number" ? doc.number : null,
    active: typeof doc.active === "boolean" ? doc.active : undefined,
    playedCurrentSeason: playedCurrentSeasonIds.has(doc._id),
  }));

  return sortActiveReviewPlayers(players);
}
