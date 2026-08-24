import { generateReconciliationReport } from "./report";
import { isReconciliationComplete } from "./status";

// npm run migrate:reconcile:preview — Migration Plan Step 3 (D6 sign-off
// gate). Read-only: resolutions are recorded through the portal review
// page (/migration-review/reconciliation), not this CLI, so there is no
// separate "run"/"apply" variant. Like publish:preview, it carries no
// local-only guard — safe to point at any environment, including
// production, to see the current state of the gate.
async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const mismatches = await generateReconciliationReport();

  for (const mismatch of mismatches) {
    const status = mismatch.resolved ? "resolved" : "UNRESOLVED";
    console.log(
      `[${status}] ${mismatch.dimension} ${mismatch.entityId} ${mismatch.field}: stored=${mismatch.storedValue} computed=${mismatch.computedValue}`,
    );
  }

  const unresolvedCount = mismatches.filter((m) => !m.resolved).length;
  console.log(
    `\n${mismatches.length} mismatch(es) found, ${unresolvedCount} unresolved.`,
  );

  if (!isReconciliationComplete(mismatches)) {
    console.log(
      "Resolve remaining mismatches at /migration-review/reconciliation before cutover.",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
