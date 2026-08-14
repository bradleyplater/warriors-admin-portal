import { listPlayers, listGames, listSeasons } from "../repositories";
import { generateAllArtifacts, writeArtifacts } from "./generate";

const OUTPUT_DIR = "artifacts";

// npm run publish:preview — generates the website JSON artifacts to disk
// without uploading anything (docs/06-local-development.md). Read-only, so
// unlike seed/reset-cli.ts it carries no local-only guard: it's safe to
// point at any environment, including production, for manual verification.
async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const [players, games, seasons] = await Promise.all([
    listPlayers(),
    listGames(),
    listSeasons(),
  ]);

  const artifacts = generateAllArtifacts(players, games, seasons);
  const paths = await writeArtifacts(artifacts, OUTPUT_DIR);

  console.log(`Wrote ${paths.length} artifacts to ${OUTPUT_DIR}/:`);
  for (const path of paths) {
    console.log(`  ${path}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
