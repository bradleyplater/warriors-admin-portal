import { runAdditiveMigration } from "./run";

// npm run migrate:additive:preview / migrate:additive:run — Migration Plan
// Step 1 (docs/04-migration-plan.md): additively backfills Player.positions/
// teamId/number, normalises Game.type casing, and backfills audit timestamps.
// Read-only in preview mode, so — like publish:preview — it carries no
// local-only guard; it's safe to point at any environment, including
// production, for manual review before the real run.
async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const dryRun = process.argv.includes("--dry-run");
  const summary = await runAdditiveMigration({ dryRun });

  let hadErrors = false;
  for (const collection of summary.collections) {
    console.log(
      `${collection.name}: ${collection.documentCount} documents, ${collection.changedCount} ${dryRun ? "would change" : "changed"}`,
    );
    for (const change of collection.changes) {
      console.log(`  ${String(change.id)}: ${JSON.stringify(change.patch)}`);
    }
    for (const error of collection.errors) {
      hadErrors = true;
      console.error(`  ERROR: ${error}`);
    }
  }

  if (hadErrors) {
    throw new Error(
      "One or more documents were skipped due to errors — see above",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
