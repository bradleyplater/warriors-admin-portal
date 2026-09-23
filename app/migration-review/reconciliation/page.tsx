import { generateReconciliationReport } from "@/lib/migration/reconcile/report";
import { isReconciliationComplete } from "@/lib/migration/reconcile/status";
import type { Mismatch } from "@/lib/migration/reconcile/types";
import { Card, PageHeader, SectionHeading } from "@/app/_ui";
import { ReviewProgress } from "../ReviewProgress";
import { ReconciliationRow } from "./ReconciliationRow";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the report to whatever the database
// held then. Force per-request rendering instead (same as the D8/D9 review
// pages).
export const dynamic = "force-dynamic";

function ReconciliationTable({
  title,
  mismatches,
}: {
  title: string;
  mismatches: Mismatch[];
}) {
  if (mismatches.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading count={mismatches.length}>{title}</SectionHeading>
      <Card flush>
        <table className="wr-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Entity</th>
              <th>Field</th>
              <th className="wr-right">Stored</th>
              <th className="wr-right">Computed</th>
              <th>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {mismatches.map((mismatch) => (
              <ReconciliationRow key={mismatch.key} mismatch={mismatch} />
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

export default async function ReconciliationReviewPage() {
  const mismatches = await generateReconciliationReport();
  const resolvedCount = mismatches.filter((m) => m.resolved).length;
  const complete = isReconciliationComplete(mismatches);

  const playerStats = mismatches.filter((m) => m.dimension === "player-stats");
  const teamStats = mismatches.filter((m) => m.dimension === "team-stats");
  const gameScore = mismatches.filter((m) => m.dimension === "game-score");

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Migration review" title="Reconciliation">
        Every disagreement between the game records and the legacy stored
        aggregates (Migration Plan Step 3 / D6). Accept the computed value once
        you&apos;ve confirmed the game records are right, or fix the game data
        and re-run — a fixed mismatch drops off this list on its own.
      </PageHeader>

      {mismatches.length === 0 ? (
        <ReviewProgress
          complete
          completeTitle="Reconciliation is clean"
          completeMessage="No mismatches found between the game records and the stored aggregates."
        />
      ) : (
        <ReviewProgress
          complete={complete}
          done={resolvedCount}
          total={mismatches.length}
          noun="resolved"
          completeTitle="Reconciliation complete"
          completeMessage={`All ${mismatches.length} mismatches resolved.`}
        />
      )}

      <ReconciliationTable title="Player stats" mismatches={playerStats} />
      <ReconciliationTable title="Team stats" mismatches={teamStats} />
      <ReconciliationTable
        title="Game score / periods"
        mismatches={gameScore}
      />
    </div>
  );
}
