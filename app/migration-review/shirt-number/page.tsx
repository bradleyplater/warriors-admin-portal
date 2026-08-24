import { listPlayersForNumberReview } from "@/lib/migration/number-review/list";
import { isNumberReviewComplete } from "@/lib/migration/number-review/status";
import { NumberReviewRow } from "./NumberReviewRow";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the review list to whatever the
// database held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function NumberReviewPage() {
  const players = await listPlayersForNumberReview();
  const complete = isNumberReviewComplete(players);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Migration review — shirt numbers
        </h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Assign a new 1–99 number to every active player listed below before
          cutover (Migration Plan Step 2 / D9). Inactive players don&apos;t
          need a number and aren&apos;t listed here. A player drops off this
          list as soon as their number is fixed.
        </p>
      </div>

      {complete ? (
        <div className="rounded border border-black/20 px-4 py-3 text-sm font-medium dark:border-white/20">
          Review complete — no active players have an out-of-range number.
        </div>
      ) : (
        <div className="rounded border border-black/20 px-4 py-3 text-sm dark:border-white/20">
          {players.length} player{players.length === 1 ? "" : "s"} still need
          a new number.
        </div>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/15">
            <th className="py-2 pr-4 font-medium">Current #</th>
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">New number</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <NumberReviewRow key={player.playerId} player={player} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
