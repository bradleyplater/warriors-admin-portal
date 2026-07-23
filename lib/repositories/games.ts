import { getDb } from "../mongodb";
import {
  GameSchema,
  GameCreateInputSchema,
  type Game,
  type GameCreateInput,
  type GoalCreateInput,
  type PenaltyCreateInput,
  type OpponentGoalCreateInput,
  type OpponentPenaltyCreateInput,
} from "../schemas";
import { stampCreate, stampUpdate } from "./internal/audit";
import { generateTopLevelId, generateEmbeddedId } from "./internal/ids";
import {
  NotFoundError,
  RosterPlayerReferencedError,
  type BlockedRosterPlayer,
} from "./internal/errors";

export interface GameUpdateInput {
  date?: Date;
  seasonId?: string;
  type?: Game["type"];
  location?: Game["location"];
  roster?: { playerId: string }[];
  opponentName?: string;
  netminderPlayerId?: string;
  manOfTheMatchPlayerId?: string;
  warriorOfTheGamePlayerId?: string;
}

async function collection() {
  const db = await getDb();
  return db.collection<Game>("games");
}

// Assigns a fresh, game-scoped id to each item in `items` (embedded goal/
// penalty entries only need to be unique within the one Game document they
// belong to — see design.md).
function assignIds<T>(items: T[], prefix: string): (T & { _id: string })[] {
  const ids: string[] = [];
  return items.map((item) => {
    const id = generateEmbeddedId(prefix, ids);
    ids.push(id);
    return { _id: id, ...item };
  });
}

function appendWithId<T>(
  items: (T & { _id: string })[],
  prefix: string,
  item: T,
): (T & { _id: string })[] {
  const id = generateEmbeddedId(
    prefix,
    items.map((existing) => existing._id),
  );
  return [...items, { _id: id, ...item }];
}

export async function createGame(input: GameCreateInput): Promise<Game> {
  const data = GameCreateInputSchema.parse(input);
  const col = await collection();

  const doc = await generateTopLevelId("GME", async (id) => {
    const candidate: Game = {
      _id: id,
      ...data,
      team: {
        ...data.team,
        goals: assignIds(data.team.goals, "GOL"),
        penalties: assignIds(data.team.penalties, "PEN"),
      },
      opponentTeam: {
        ...data.opponentTeam,
        goals: assignIds(data.opponentTeam.goals, "OGL"),
        penalties: assignIds(data.opponentTeam.penalties, "OPP"),
      },
      ...stampCreate(),
    };
    await col.insertOne(candidate);
    return candidate;
  });
  return GameSchema.parse(doc);
}

export async function getGame(id: string): Promise<Game | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  return doc ? GameSchema.parse(doc) : null;
}

export async function listGames(): Promise<Game[]> {
  const col = await collection();
  const docs = await col.find().toArray();
  return docs.map((doc) => GameSchema.parse(doc));
}

async function loadExisting(col: Awaited<ReturnType<typeof collection>>, id: string): Promise<Game> {
  const existing = await col.findOne({ _id: id });
  if (!existing) {
    throw new NotFoundError("game", id);
  }
  return existing;
}

export async function updateGame(
  id: string,
  patch: GameUpdateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, id);

  const merged: Game = {
    ...existing,
    ...(patch.date !== undefined && { date: patch.date }),
    ...(patch.seasonId !== undefined && { seasonId: patch.seasonId }),
    ...(patch.type !== undefined && { type: patch.type }),
    ...(patch.location !== undefined && { location: patch.location }),
    ...(patch.netminderPlayerId !== undefined && {
      netminderPlayerId: patch.netminderPlayerId,
    }),
    ...(patch.manOfTheMatchPlayerId !== undefined && {
      manOfTheMatchPlayerId: patch.manOfTheMatchPlayerId,
    }),
    ...(patch.warriorOfTheGamePlayerId !== undefined && {
      warriorOfTheGamePlayerId: patch.warriorOfTheGamePlayerId,
    }),
    team: {
      ...existing.team,
      ...(patch.roster !== undefined && { roster: patch.roster }),
    },
    opponentTeam: {
      ...existing.opponentTeam,
      ...(patch.opponentName !== undefined && { name: patch.opponentName }),
    },
    ...stampUpdate(),
  };

  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: id }, validated);
  return validated;
}

// Counts every place `playerId` is referenced within `game` (goals as
// scorer or assist, penalties as offender, and the three award fields).
// Returns null when the player isn't referenced anywhere, so callers can
// filter with a type guard.
function referencesFor(game: Game, playerId: string): BlockedRosterPlayer | null {
  const goalCount = game.team.goals.filter((goal) => goal.scoredBy === playerId).length;
  const assistCount = game.team.goals.filter(
    (goal) => goal.assist1 === playerId || goal.assist2 === playerId,
  ).length;
  const penaltyCount = game.team.penalties.filter(
    (penalty) => penalty.offender === playerId,
  ).length;
  const isNetminder = game.netminderPlayerId === playerId;
  const isManOfTheMatch = game.manOfTheMatchPlayerId === playerId;
  const isWarriorOfTheGame = game.warriorOfTheGamePlayerId === playerId;

  const isReferenced =
    goalCount > 0 ||
    assistCount > 0 ||
    penaltyCount > 0 ||
    isNetminder ||
    isManOfTheMatch ||
    isWarriorOfTheGame;

  if (!isReferenced) return null;

  return {
    playerId,
    goalCount,
    assistCount,
    penaltyCount,
    isNetminder,
    isManOfTheMatch,
    isWarriorOfTheGame,
  };
}

// Applies a requested roster change, but blocks removal only of players
// still referenced by a goal/assist/penalty/award — every other requested
// removal or addition is applied. The write always happens first (blocked
// players are added back into the roster before validating), then
// RosterPlayerReferencedError is thrown afterward if anything was blocked
// — see design.md for why this intentionally differs from every other
// domain error in this file, which is thrown before any write occurs.
export async function updateGameRoster(
  gameId: string,
  requestedRoster: { playerId: string }[],
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const requestedIds = new Set(requestedRoster.map((entry) => entry.playerId));
  const removedIds = existing.team.roster
    .map((entry) => entry.playerId)
    .filter((playerId) => !requestedIds.has(playerId));

  const blocked = removedIds
    .map((playerId) => referencesFor(existing, playerId))
    .filter((entry): entry is BlockedRosterPlayer => entry !== null);
  const blockedIds = new Set(blocked.map((entry) => entry.playerId));

  const appliedRoster = [
    ...requestedRoster,
    ...existing.team.roster.filter((entry) => blockedIds.has(entry.playerId)),
  ];

  const merged: Game = {
    ...existing,
    team: { ...existing.team, roster: appliedRoster },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);

  if (blocked.length > 0) {
    throw new RosterPlayerReferencedError(blocked);
  }
  return validated;
}

export async function addGoal(
  gameId: string,
  goal: GoalCreateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);
  const merged: Game = {
    ...existing,
    team: { ...existing.team, goals: appendWithId(existing.team.goals, "GOL", goal) },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function editGoal(
  gameId: string,
  goalId: string,
  goal: GoalCreateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const index = existing.team.goals.findIndex((entry) => entry._id === goalId);
  if (index === -1) {
    throw new NotFoundError("goal", goalId);
  }

  const goals = [...existing.team.goals];
  goals[index] = { _id: goalId, ...goal };

  const merged: Game = {
    ...existing,
    team: { ...existing.team, goals },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function deleteGoal(gameId: string, goalId: string): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const goals = existing.team.goals.filter((entry) => entry._id !== goalId);
  if (goals.length === existing.team.goals.length) {
    throw new NotFoundError("goal", goalId);
  }

  const merged: Game = {
    ...existing,
    team: { ...existing.team, goals },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function addPenalty(
  gameId: string,
  penalty: PenaltyCreateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);
  const merged: Game = {
    ...existing,
    team: {
      ...existing.team,
      penalties: appendWithId(existing.team.penalties, "PEN", penalty),
    },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function addOpponentGoal(
  gameId: string,
  goal: OpponentGoalCreateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);
  const merged: Game = {
    ...existing,
    opponentTeam: {
      ...existing.opponentTeam,
      goals: appendWithId(existing.opponentTeam.goals, "OGL", goal),
    },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function addOpponentPenalty(
  gameId: string,
  penalty: OpponentPenaltyCreateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);
  const merged: Game = {
    ...existing,
    opponentTeam: {
      ...existing.opponentTeam,
      penalties: appendWithId(existing.opponentTeam.penalties, "OPP", penalty),
    },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function deleteGame(id: string): Promise<void> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new NotFoundError("game", id);
  }
}
