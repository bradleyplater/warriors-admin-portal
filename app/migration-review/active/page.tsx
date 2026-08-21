import { listPlayersForActiveReview } from "@/lib/migration/active-review/list";
import { isActiveReviewComplete } from "@/lib/migration/active-review/status";
import { ActiveReviewRow } from "./ActiveReviewRow";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the review list to whatever the
// database held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function ActiveReviewPage() {
  const players = await listPlayersForActiveReview();
  const reviewedCount = players.filter(
    (player) => typeof player.active === "boolean",
  ).length;
  const complete = isActiveReviewComplete(players);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Migration review — active flags</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Mark every player Active or Inactive before cutover (Migration Plan
          Step 2 / D8). Players who played this season are listed first as a
          hint — it isn&apos;t authoritative, so every player still needs an
          explicit decision.
        </p>
      </div>

      {complete ? (
        <div className="rounded border border-black/20 px-4 py-3 text-sm font-medium dark:border-white/20">
          Review complete — all {players.length} players have been marked.
        </div>
      ) : (
        <div className="rounded border border-black/20 px-4 py-3 text-sm dark:border-white/20">
          {reviewedCount}/{players.length} reviewed
        </div>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/15">
            <th className="py-2 pr-4 font-medium">#</th>
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <ActiveReviewRow key={player.playerId} player={player} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
