import { runBackup } from "./run";

// npm run backup:run — dumps every collection in the DB at MONGODB_URI to
// the S3 bucket at S3_BUCKET, under a fresh backups/<timestamp>/ prefix.
async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!process.env.S3_BUCKET) {
    throw new Error("S3_BUCKET is not set");
  }

  const summary = await runBackup();

  console.log(`Backup "${summary.prefix}" complete`);
  for (const collection of summary.collections) {
    console.log(`  ${collection.name}: ${collection.documentCount} documents`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
