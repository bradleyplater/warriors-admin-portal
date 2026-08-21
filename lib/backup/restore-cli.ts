import { MongoClient } from "mongodb";
import { assertLocalOrAllowed } from "../../seed/guard";
import { runRestore } from "./restore";

function getArgValue(argv: string[], flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const match = argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

// npm run backup:restore -- --prefix=<backups/... timestamp> [--target=<uri>] [--allow-remote]
// Restores a backup produced by backup:run into a target database — the
// current MONGODB_URI by default, or --target. Refuses a non-local target
// unless --allow-remote is passed, same rule seed/reset-cli.ts enforces, so
// a copied command can never silently overwrite production.
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const prefix = getArgValue(argv, "prefix");
  if (!prefix) {
    throw new Error(
      "Usage: npm run backup:restore -- --prefix=<backup-prefix> [--target=<uri>] [--allow-remote]",
    );
  }
  if (!process.env.S3_BUCKET) {
    throw new Error("S3_BUCKET is not set");
  }

  const targetUri = getArgValue(argv, "target") ?? process.env.MONGODB_URI;
  if (!targetUri) {
    throw new Error("MONGODB_URI is not set and no --target was given");
  }
  assertLocalOrAllowed(targetUri, argv);

  const client = new MongoClient(targetUri, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  try {
    const summary = await runRestore(prefix, client.db());
    console.log(`Restored backup "${summary.prefix}" into ${targetUri}`);
    for (const collection of summary.collections) {
      console.log(`  ${collection.name}: ${collection.documentCount} documents`);
    }
  } finally {
    await client.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
