import { getDb } from "../../mongodb";
import { COLLECTION_NAMES } from "../../repositories/internal/collections";

export interface NumberReviewPlayer {
  playerId: string;
  firstName: string;
  surname: string;
  currentNumber: number;
}

export function sortNumberReviewPlayers(
  players: NumberReviewPlayer[],
): NumberReviewPlayer[] {
  return [...players].sort((a, b) => {
    if (a.currentNumber !== b.currentNumber) {
      return a.currentNumber - b.currentNumber;
    }
    return a.surname.localeCompare(b.surname);
  });
}

interface RawPlayerDoc {
  _id: string;
  firstName?: unknown;
  surname?: unknown;
  number?: unknown;
}

// Reads via the raw driver rather than the players repository's
// listPlayers(), which validates every document against PlayerSchema —
// `number` there is constrained to 1–99, so any doc this review needs to
// surface (its number is *outside* that range) would fail PlayerSchema.parse
// and take listPlayers() down entirely. Only active players are queried:
// inactive players don't need a valid number (D9), so an inactive player's
// out-of-range number is left untouched and never listed here.
export async function listPlayersForNumberReview(): Promise<
  NumberReviewPlayer[]
> {
  const db = await getDb();
  const docs = await db
    .collection<RawPlayerDoc>(COLLECTION_NAMES.player)
    .find({
      active: true,
      $or: [{ number: { $lt: 1 } }, { number: { $gt: 99 } }],
    })
    .toArray();

  const players: NumberReviewPlayer[] = docs.map((doc) => ({
    playerId: doc._id,
    firstName: typeof doc.firstName === "string" ? doc.firstName : "",
    surname: typeof doc.surname === "string" ? doc.surname : "",
    currentNumber: typeof doc.number === "number" ? doc.number : 0,
  }));

  return sortNumberReviewPlayers(players);
}
