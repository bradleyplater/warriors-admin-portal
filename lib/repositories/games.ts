import { getDb } from "../mongodb";
import {
  GameSchema,
  GameCreateInputSchema,
  MAX_PHOTOS_PER_GAME,
  type Game,
  type GamePhoto,
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
  PhotoLimitReachedError,
  PhotoNotFoundError,
  RosterPlayerReferencedError,
  type BlockedRosterPlayer,
} from "./internal/errors";
import { COLLECTION_NAMES } from "./internal/collections";

export interface GameUpdateInput {
  date?: Date;
  seasonId?: string;
  type?: Game["type"];
  location?: Game["location"];
  roster?: { playerId: string }[];
  opponentId?: string;
  // undefined = leave unchanged; null = explicitly clear. These three are
  // the only genuinely optional, clearable fields on Game — the merge below
  // must delete the key rather than set it to `undefined`, since the
  // mongodb driver's default ignoreUndefined:false would otherwise
  // serialize an explicit undefined as BSON null, which GameSchema's
  // z.string().optional() rejects on the next read.
  netminderPlayerId?: string | null;
  manOfTheMatchPlayerId?: string | null;
  warriorOfTheGamePlayerId?: string | null;
}

type AwardField =
  | "netminderPlayerId"
  | "manOfTheMatchPlayerId"
  | "warriorOfTheGamePlayerId";

function applyAwardPatch(
  game: Game,
  field: AwardField,
  value: string | null | undefined,
): void {
  if (value === undefined) return;
  if (value === null) {
    delete game[field];
  } else {
    game[field] = value;
  }
}

async function collection() {
  const db = await getDb();
  return db.collection<Game>(COLLECTION_NAMES.game);
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

// The unpublished-changes indicator's per-collection freshness check (see
// docs/02-architecture.md#the-publish-pipeline) — served by the
// { updatedAt: -1 } index in internal/indexes.ts.
export async function getGamesLatestUpdatedAt(): Promise<Date | null> {
  const col = await collection();
  const [doc] = await col
    .find()
    .sort({ updatedAt: -1 })
    .limit(1)
    .toArray();
  return doc?.updatedAt ?? null;
}

// Used to block deleting an opponent that games still reference — served
// by the { "opponentTeam.opponentId": 1 } index in internal/indexes.ts.
export async function countGamesByOpponentId(opponentId: string): Promise<number> {
  const col = await collection();
  return col.countDocuments({ "opponentTeam.opponentId": opponentId });
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
    team: {
      ...existing.team,
      ...(patch.roster !== undefined && { roster: patch.roster }),
    },
    opponentTeam: {
      ...existing.opponentTeam,
      ...(patch.opponentId !== undefined && { opponentId: patch.opponentId }),
    },
    ...stampUpdate(),
  };

  applyAwardPatch(merged, "netminderPlayerId", patch.netminderPlayerId);
  applyAwardPatch(merged, "manOfTheMatchPlayerId", patch.manOfTheMatchPlayerId);
  applyAwardPatch(
    merged,
    "warriorOfTheGamePlayerId",
    patch.warriorOfTheGamePlayerId,
  );

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

export async function editPenalty(
  gameId: string,
  penaltyId: string,
  penalty: PenaltyCreateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const index = existing.team.penalties.findIndex(
    (entry) => entry._id === penaltyId,
  );
  if (index === -1) {
    throw new NotFoundError("penalty", penaltyId);
  }

  const penalties = [...existing.team.penalties];
  penalties[index] = { _id: penaltyId, ...penalty };

  const merged: Game = {
    ...existing,
    team: { ...existing.team, penalties },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function deletePenalty(
  gameId: string,
  penaltyId: string,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const penalties = existing.team.penalties.filter(
    (entry) => entry._id !== penaltyId,
  );
  if (penalties.length === existing.team.penalties.length) {
    throw new NotFoundError("penalty", penaltyId);
  }

  const merged: Game = {
    ...existing,
    team: { ...existing.team, penalties },
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

export async function editOpponentGoal(
  gameId: string,
  opponentGoalId: string,
  goal: OpponentGoalCreateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const index = existing.opponentTeam.goals.findIndex(
    (entry) => entry._id === opponentGoalId,
  );
  if (index === -1) {
    throw new NotFoundError("opponent goal", opponentGoalId);
  }

  const goals = [...existing.opponentTeam.goals];
  goals[index] = { _id: opponentGoalId, ...goal };

  const merged: Game = {
    ...existing,
    opponentTeam: { ...existing.opponentTeam, goals },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function deleteOpponentGoal(
  gameId: string,
  opponentGoalId: string,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const goals = existing.opponentTeam.goals.filter(
    (entry) => entry._id !== opponentGoalId,
  );
  if (goals.length === existing.opponentTeam.goals.length) {
    throw new NotFoundError("opponent goal", opponentGoalId);
  }

  const merged: Game = {
    ...existing,
    opponentTeam: { ...existing.opponentTeam, goals },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function editOpponentPenalty(
  gameId: string,
  opponentPenaltyId: string,
  penalty: OpponentPenaltyCreateInput,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const index = existing.opponentTeam.penalties.findIndex(
    (entry) => entry._id === opponentPenaltyId,
  );
  if (index === -1) {
    throw new NotFoundError("opponent penalty", opponentPenaltyId);
  }

  const penalties = [...existing.opponentTeam.penalties];
  penalties[index] = { _id: opponentPenaltyId, ...penalty };

  const merged: Game = {
    ...existing,
    opponentTeam: { ...existing.opponentTeam, penalties },
    ...stampUpdate(),
  };
  const validated = GameSchema.parse(merged);
  await col.replaceOne({ _id: gameId }, validated);
  return validated;
}

export async function deleteOpponentPenalty(
  gameId: string,
  opponentPenaltyId: string,
): Promise<Game> {
  const col = await collection();
  const existing = await loadExisting(col, gameId);

  const penalties = existing.opponentTeam.penalties.filter(
    (entry) => entry._id !== opponentPenaltyId,
  );
  if (penalties.length === existing.opponentTeam.penalties.length) {
    throw new NotFoundError("opponent penalty", opponentPenaltyId);
  }

  const merged: Game = {
    ...existing,
    opponentTeam: { ...existing.opponentTeam, penalties },
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

// Appends a photo whose object is already in S3 (add-game-photos design D4).
// The 6-photo limit is part of the update's filter, so two concurrent
// uploads can never push a seventh.
export async function addGamePhoto(gameId: string, key: string): Promise<Game> {
  const col = await collection();
  const updated = await col.findOneAndUpdate(
    {
      _id: gameId,
      $expr: {
        $lt: [{ $size: { $ifNull: ["$photos", []] } }, MAX_PHOTOS_PER_GAME],
      },
    },
    { $push: { photos: { key } }, $set: stampUpdate() },
    { returnDocument: "after" },
  );
  if (!updated) {
    await loadExisting(col, gameId); // throws NotFoundError if it's missing
    throw new PhotoLimitReachedError(MAX_PHOTOS_PER_GAME);
  }
  return GameSchema.parse(updated);
}

// Read-modify-write of just the photos array, guarded by a filter on the
// array as it was read so a concurrent change (in practice: another tab) is
// never silently overwritten — retried once against the fresh array.
// Photos are addressed by key, never index (design D5), so a stale page
// can't hit the wrong photo after a reorder.
async function rewritePhotos(
  gameId: string,
  key: string,
  change: (photos: GamePhoto[], index: number) => GamePhoto[],
): Promise<Game> {
  const col = await collection();
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await loadExisting(col, gameId);
    const photos = existing.photos ?? [];
    const index = photos.findIndex((photo) => photo.key === key);
    if (index === -1) {
      throw new PhotoNotFoundError(gameId, key);
    }

    const validated = GameSchema.parse({
      ...existing,
      photos: change(photos, index),
      ...stampUpdate(),
    });
    const result = await col.updateOne(
      { _id: gameId, photos },
      { $set: { photos: validated.photos ?? [], updatedAt: validated.updatedAt } },
    );
    if (result.matchedCount === 1) {
      return validated;
    }
  }
  throw new Error(`Game "${gameId}" photos changed while updating; try again`);
}

export interface GamePhotoTextInput {
  alt?: string;
  caption?: string;
}

// Blank or missing text clears the field rather than storing "".
export async function updateGamePhotoText(
  gameId: string,
  key: string,
  text: GamePhotoTextInput,
): Promise<Game> {
  const alt = text.alt?.trim();
  const caption = text.caption?.trim();
  return rewritePhotos(gameId, key, (photos, index) =>
    photos.map((photo, i) =>
      i === index
        ? { key: photo.key, ...(alt && { alt }), ...(caption && { caption }) }
        : photo,
    ),
  );
}

// Moving the first photo earlier or the last later leaves the order as it is.
export async function moveGamePhoto(
  gameId: string,
  key: string,
  direction: "earlier" | "later",
): Promise<Game> {
  return rewritePhotos(gameId, key, (photos, index) => {
    const target = direction === "earlier" ? index - 1 : index + 1;
    if (target < 0 || target >= photos.length) {
      return photos;
    }
    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    return reordered;
  });
}

export async function removeGamePhoto(gameId: string, key: string): Promise<Game> {
  return rewritePhotos(gameId, key, (photos, index) =>
    photos.filter((_, i) => i !== index),
  );
}
