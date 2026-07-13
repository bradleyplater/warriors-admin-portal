import { getDb } from "../mongodb";
import { TeamSchema, type Team, type TeamCreateInput } from "../schemas";
import { stampUpdate } from "./internal/audit";
import { NotFoundError } from "./internal/errors";

// No `create` here — there is exactly one Team document, created once via
// seed/migration; the PRD excludes multi-team support (see design.md).
type TeamUpdateInput = Partial<TeamCreateInput>;

async function collection() {
  const db = await getDb();
  return db.collection<Team>("team");
}

export async function getTeam(id: string): Promise<Team | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  return doc ? TeamSchema.parse(doc) : null;
}

export async function updateTeam(
  id: string,
  input: TeamUpdateInput,
): Promise<Team> {
  const col = await collection();
  const result = await col.findOneAndUpdate(
    { _id: id },
    { $set: { ...input, ...stampUpdate() } },
    { returnDocument: "after" },
  );
  if (!result) {
    throw new NotFoundError("team", id);
  }
  return TeamSchema.parse(result);
}
