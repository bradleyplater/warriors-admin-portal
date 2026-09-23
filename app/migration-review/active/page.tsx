import { listPlayersForActiveReview } from "@/lib/migration/active-review/list";
import { isActiveReviewComplete } from "@/lib/migration/active-review/status";
import { Card, PageHeader } from "@/app/_ui";
import { ReviewProgress } from "../ReviewProgress";
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
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Migration review" title="Active flags">
        Mark every player Active or Inactive before cutover (Migration Plan Step
        2 / D8). Players who played this season are listed first as a hint — it
        isn&apos;t authoritative, so every player still needs an explicit
        decision.
      </PageHeader>

      <ReviewProgress
        complete={complete}
        done={reviewedCount}
        total={players.length}
        noun="reviewed"
        completeTitle="Review complete"
        completeMessage={`All ${players.length} players have been marked.`}
      />

      <Card flush>
        <table className="wr-table">
          <thead>
            <tr>
              <th className="w-16">#</th>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <ActiveReviewRow key={player.playerId} player={player} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
