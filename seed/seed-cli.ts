import { assertLocalOrAllowed } from "./guard";
import { runSeed } from "./run";

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  assertLocalOrAllowed(uri, process.argv.slice(2));
  await runSeed();
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
