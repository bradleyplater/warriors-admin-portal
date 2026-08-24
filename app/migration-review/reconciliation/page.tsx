import { generateReconciliationReport } from "@/lib/migration/reconcile/report";
import { isReconciliationComplete } from "@/lib/migration/reconcile/status";
import type { Mismatch } from "@/lib/migration/reconcile/types";
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
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{title}</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/15">
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Entity</th>
            <th className="py-2 pr-4 font-medium">Field</th>
            <th className="py-2 pr-4 font-medium">Stored</th>
            <th className="py-2 pr-4 font-medium">Computed</th>
            <th className="py-2 pr-4 font-medium">Resolution</th>
          </tr>
        </thead>
        <tbody>
          {mismatches.map((mismatch) => (
            <ReconciliationRow key={mismatch.key} mismatch={mismatch} />
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Migration review — reconciliation
        </h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Every disagreement between the game records and the legacy stored
          aggregates (Migration Plan Step 3 / D6). Accept the computed value
          once you&apos;ve confirmed the game records are right, or fix the
          game data and re-run — a fixed mismatch drops off this list on its
          own.
        </p>
      </div>

      {mismatches.length === 0 ? (
        <div className="rounded border border-black/20 px-4 py-3 text-sm font-medium dark:border-white/20">
          No mismatches found — reconciliation is clean.
        </div>
      ) : complete ? (
        <div className="rounded border border-black/20 px-4 py-3 text-sm font-medium dark:border-white/20">
          Reconciliation complete — all {mismatches.length} mismatches
          resolved.
        </div>
      ) : (
        <div className="rounded border border-black/20 px-4 py-3 text-sm dark:border-white/20">
          {resolvedCount}/{mismatches.length} resolved
        </div>
      )}

      <ReconciliationTable title="Player stats" mismatches={playerStats} />
      <ReconciliationTable title="Team stats" mismatches={teamStats} />
      <ReconciliationTable title="Game score / periods" mismatches={gameScore} />
    </div>
  );
}
