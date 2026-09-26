import { z } from "zod";
import { getDb } from "../../mongodb";
import { COLLECTION_NAMES } from "../../repositories/internal/collections";
import { stampUpdate } from "../../repositories/internal/audit";
import { createOpponent, findOpponentByName } from "../../repositories";
import { GameSchema } from "../../schemas";

// One-off backfill for add-opponents (design D10): turns every game's
// free-text opponentTeam.name into a reference to an Opponent document, in
// one step. Driven by a committed mapping of raw name → canonical name that
// was agreed with the user one name at a time — this script never guesses a
// mapping itself. Removed once it has run against production.

export const MappingSchema = z
  .array(
    z.object({
      canonicalName: z.string().trim().min(1),
      rawNames: z.array(z.string()).min(1),
    }),
  )
  .superRefine((entries, ctx) => {
    const seenCanonical = new Map<string, number>();
    const seenRaw = new Map<string, number>();
    entries.forEach((entry, index) => {
      const canonicalKey = entry.canonicalName.trim().toLowerCase();
      const previous = seenCanonical.get(canonicalKey);
      if (previous !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `Canonical name "${entry.canonicalName}" also appears in entry ${previous} — merge them`,
          path: [index, "canonicalName"],
        });
      }
      seenCanonical.set(canonicalKey, index);
      for (const raw of entry.rawNames) {
        const owner = seenRaw.get(raw);
        if (owner !== undefined) {
          ctx.addIssue({
            code: "custom",
            message: `Raw name "${raw}" is mapped by both entry ${owner} and entry ${index}`,
            path: [index, "rawNames"],
          });
        }
        seenRaw.set(raw, index);
      }
    });
  });
export type OpponentMapping = z.infer<typeof MappingSchema>;

export interface PlannedOpponent {
  canonicalName: string;
  existingOpponentId?: string;
  rawNames: { name: string; gameCount: number }[];
}

export interface OpponentMigrationSummary {
  apply: boolean;
  rawNames: { name: string; gameCount: number }[];
  // Raw names on games with no mapping entry — any of these blocks apply.
  unmappedRawNames: string[];
  // Mapping entries' raw names that no game has — expected on a re-run.
  unusedRawNames: string[];
  planned: PlannedOpponent[];
  applied?: { opponentsCreated: number; gamesUpdated: number };
  verification?: { problems: string[] };
}

interface RawGame {
  _id: string;
  opponentTeam?: { name?: unknown; opponentId?: unknown };
}

async function gamesCollection() {
  const db = await getDb();
  return db.collection<RawGame>(COLLECTION_NAMES.game);
}

async function countRawNames(): Promise<{ name: string; gameCount: number }[]> {
  const games = await gamesCollection();
  const groups = await games
    .aggregate<{ _id: string; gameCount: number }>([
      { $match: { "opponentTeam.name": { $type: "string" } } },
      { $group: { _id: "$opponentTeam.name", gameCount: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  return groups.map((group) => ({ name: group._id, gameCount: group.gameCount }));
}

// Checks the end state the rest of the app relies on: no game carries a
// name, every game references an opponent that exists, and every game
// passes the (new) GameSchema.
export async function verifyOpponentReferences(): Promise<string[]> {
  const db = await getDb();
  const games = await db.collection<RawGame>(COLLECTION_NAMES.game).find().toArray();
  const opponentIds = new Set(
    (
      await db
        .collection<{ _id: string }>(COLLECTION_NAMES.opponent)
        .find({}, { projection: { _id: 1 } })
        .toArray()
    ).map((opponent) => opponent._id),
  );

  const problems: string[] = [];
  for (const game of games) {
    if (game.opponentTeam?.name !== undefined) {
      problems.push(`Game ${game._id} still has opponentTeam.name`);
    }
    const opponentId = game.opponentTeam?.opponentId;
    if (typeof opponentId !== "string") {
      problems.push(`Game ${game._id} has no opponentTeam.opponentId`);
    } else if (!opponentIds.has(opponentId)) {
      problems.push(`Game ${game._id} references missing opponent ${opponentId}`);
    }
    const parsed = GameSchema.safeParse(game);
    if (!parsed.success) {
      problems.push(
        `Game ${game._id} fails GameSchema: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")}`,
      );
    }
  }
  return problems;
}

export async function runOpponentMigration({
  mapping: rawMapping,
  apply,
}: {
  mapping: unknown;
  apply: boolean;
}): Promise<OpponentMigrationSummary> {
  const mapping = MappingSchema.parse(rawMapping);
  const rawNames = await countRawNames();
  const countByRaw = new Map(rawNames.map((raw) => [raw.name, raw.gameCount]));
  const mappedRaw = new Set(mapping.flatMap((entry) => entry.rawNames));

  const unmappedRawNames = rawNames
    .map((raw) => raw.name)
    .filter((name) => !mappedRaw.has(name));
  const unusedRawNames = [...mappedRaw].filter((name) => !countByRaw.has(name));

  const planned: PlannedOpponent[] = [];
  for (const entry of mapping) {
    const present = entry.rawNames
      .filter((name) => countByRaw.has(name))
      .map((name) => ({ name, gameCount: countByRaw.get(name) ?? 0 }));
    // An entry none of whose raw names are on any game has nothing to do —
    // which is every entry on a re-run, so a re-run creates nothing.
    if (present.length === 0) continue;
    const existing = await findOpponentByName(entry.canonicalName);
    planned.push({
      canonicalName: entry.canonicalName.trim(),
      existingOpponentId: existing?._id,
      rawNames: present,
    });
  }

  const summary: OpponentMigrationSummary = {
    apply,
    rawNames,
    unmappedRawNames,
    unusedRawNames,
    planned,
  };

  if (!apply) {
    return summary;
  }
  if (unmappedRawNames.length > 0) {
    throw new Error(
      `Refusing to apply: ${unmappedRawNames.length} raw opponent name(s) have no mapping: ${unmappedRawNames
        .map((name) => JSON.stringify(name))
        .join(", ")}`,
    );
  }

  const games = await gamesCollection();
  let opponentsCreated = 0;
  let gamesUpdated = 0;
  for (const plan of planned) {
    let opponentId = plan.existingOpponentId;
    if (!opponentId) {
      opponentId = (await createOpponent({ name: plan.canonicalName }))._id;
      opponentsCreated++;
    }
    for (const raw of plan.rawNames) {
      const result = await games.updateMany(
        { "opponentTeam.name": raw.name },
        {
          $set: { "opponentTeam.opponentId": opponentId, ...stampUpdate() },
          $unset: { "opponentTeam.name": "" },
        },
      );
      gamesUpdated += result.modifiedCount;
    }
  }

  summary.applied = { opponentsCreated, gamesUpdated };
  summary.verification = { problems: await verifyOpponentReferences() };
  return summary;
}
