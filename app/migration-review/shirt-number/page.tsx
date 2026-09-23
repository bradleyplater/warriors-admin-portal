import { listPlayersForNumberReview } from "@/lib/migration/number-review/list";
import { isNumberReviewComplete } from "@/lib/migration/number-review/status";
import { Card, PageHeader } from "@/app/_ui";
import { ReviewProgress } from "../ReviewProgress";
import { NumberReviewRow } from "./NumberReviewRow";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the review list to whatever the
// database held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function NumberReviewPage() {
  const players = await listPlayersForNumberReview();
  const complete = isNumberReviewComplete(players);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Migration review" title="Shirt numbers">
        Assign a new 1–99 number to every active player listed below before
        cutover (Migration Plan Step 2 / D9). Inactive players don&apos;t need a
        number and aren&apos;t listed here. A player drops off this list as soon
        as their number is fixed.
      </PageHeader>

      {complete ? (
        <ReviewProgress
          complete
          completeTitle="Review complete"
          completeMessage="No active players have an out-of-range number."
        />
      ) : (
        <p className="m-0 flex items-baseline gap-2">
          <span className="t-data wr-strong text-base">{players.length}</span>
          <span className="t-label text-fg-secondary">
            {players.length === 1 ? "player still needs" : "players still need"}{" "}
            a new number
          </span>
        </p>
      )}

      {players.length > 0 && (
        <Card flush>
          <table className="wr-table">
            <thead>
              <tr>
                <th className="w-28">Current #</th>
                <th>Name</th>
                <th>New number</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <NumberReviewRow key={player.playerId} player={player} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
