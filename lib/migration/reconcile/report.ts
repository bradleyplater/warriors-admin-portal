import { getDb } from "../../mongodb";
import { listGames, listSeasons, listReconciliationResolutions } from "../../repositories";
import { COLLECTION_NAMES } from "../../repositories/internal/collections";
import {
  comparePlayerStatsMismatches,
  type RawPlayerDoc,
  type RawTeamPlayerEntry,
} from "./player-stats";
import { compareTeamStatsMismatches, type RawTeamStatsEntry } from "./team-stats";
import { compareGameScoreMismatches, type RawGameDoc } from "./game-score";
import { applyResolutions } from "./resolutions";
import type { Mismatch, RawMismatch } from "./types";

interface RawTeamDoc {
  _id: string;
  players?: RawTeamPlayerEntry[];
  stats?: RawTeamStatsEntry[];
}

const GAME_SCORE_PROJECTION = {
  _id: 1,
  "team.goals": 1,
  "opponentTeam.goals": 1,
  score: 1,
} as const;

// Migration Plan Step 3 (docs/04-migration-plan.md) / D6 sign-off gate.
// Recomputes every player's and the team's per-season stats, and every
// game's score/period line, from Game documents alone, and diffs each
// against the legacy stored aggregate. Player/Team/Game are read via the
// raw driver here rather than their repositories — the target-shape
// schemas strip the legacy `stats`/`players`/`score` fields on parse
// (they're frozen, not part of the target model), so there's nothing left
// to reconcile against once validated. `listGames()` still supplies the
// validated Game[] the derivation formulas expect; the raw driver only
// covers the legacy fields those formulas don't need.
export async function generateReconciliationReport(): Promise<Mismatch[]> {
  const db = await getDb();

  const [games, seasons, resolutions, rawPlayers, rawTeam, rawGames] =
    await Promise.all([
      listGames(),
      listSeasons(),
      listReconciliationResolutions(),
      db.collection<RawPlayerDoc>(COLLECTION_NAMES.player).find({}).toArray(),
      db.collection<RawTeamDoc>(COLLECTION_NAMES.team).findOne({}),
      db
        .collection<RawGameDoc>(COLLECTION_NAMES.game)
        .find({}, { projection: GAME_SCORE_PROJECTION })
        .toArray(),
    ]);

  const seasonIds = seasons.map((season) => season._id);
  const teamId = rawTeam?._id ?? "";

  const rawMismatches: RawMismatch[] = [
    ...comparePlayerStatsMismatches(
      rawPlayers,
      rawTeam?.players ?? [],
      games,
      seasonIds,
    ),
    ...compareTeamStatsMismatches(teamId, rawTeam?.stats, games, seasonIds),
    ...compareGameScoreMismatches(rawGames),
  ];

  return applyResolutions(rawMismatches, resolutions);
}
