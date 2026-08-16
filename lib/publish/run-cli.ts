import { runPublish } from "./run";

// npm run publish:run — runs the real publish pipeline: uploads changed
// artifacts to the configured S3 bucket, invalidates the CDN if configured,
// and records a Publishes document. Unlike publish:preview, this writes to
// the real bucket/CDN the configured env vars point at.
async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!process.env.S3_BUCKET) {
    throw new Error("S3_BUCKET is not set");
  }

  const publish = await runPublish();

  console.log(`Publish ${publish._id}: ${publish.status}`);
  for (const artifact of publish.artifacts) {
    console.log(
      `  ${artifact.changed ? "uploaded" : "skipped"} ${artifact.path} (${artifact.checksum})`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
