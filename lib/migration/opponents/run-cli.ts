import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runOpponentMigration } from "./run";

// npm run migrate:opponents:preview / migrate:opponents:run (add-opponents
// design D10). Preview (the default) is read-only, so like the earlier
// migrations it carries no local-only guard and can be pointed at
// production for review via scripts/with-env.mjs. --apply writes; take a
// backup first (npm run backup) and only apply once the preview is clean.
// --mapping=<path> overrides the committed mapping.json.
async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const apply = process.argv.includes("--apply");
  const mappingArg = process.argv.find((arg) => arg.startsWith("--mapping="));
  const mappingPath = mappingArg
    ? mappingArg.slice("--mapping=".length)
    : join(__dirname, "mapping.json");
  const mapping: unknown = JSON.parse(readFileSync(mappingPath, "utf-8"));

  const summary = await runOpponentMigration({ mapping, apply });

  console.log(`Mode: ${apply ? "APPLY" : "preview (no writes)"}`);
  console.log(`Raw opponent names on games: ${summary.rawNames.length}`);
  for (const plan of summary.planned) {
    const games = plan.rawNames.reduce((total, raw) => total + raw.gameCount, 0);
    const action = plan.existingOpponentId
      ? `reuse ${plan.existingOpponentId}`
      : "create";
    console.log(`  ${plan.canonicalName} (${action}, ${games} games)`);
    for (const raw of plan.rawNames) {
      console.log(`    ← ${JSON.stringify(raw.name)} × ${raw.gameCount}`);
    }
  }
  for (const name of summary.unusedRawNames) {
    console.warn(`  WARNING: mapped raw name ${JSON.stringify(name)} is on no game`);
  }
  for (const name of summary.unmappedRawNames) {
    console.error(`  ERROR: raw name ${JSON.stringify(name)} has no mapping`);
  }

  if (summary.applied) {
    console.log(
      `Created ${summary.applied.opponentsCreated} opponents, updated ${summary.applied.gamesUpdated} games.`,
    );
  }
  const problems = summary.verification?.problems ?? [];
  for (const problem of problems) {
    console.error(`  VERIFY: ${problem}`);
  }

  if (summary.unmappedRawNames.length > 0) {
    throw new Error("Unmapped raw names — extend mapping.json before applying");
  }
  if (problems.length > 0) {
    throw new Error("Post-apply verification failed — see above");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
