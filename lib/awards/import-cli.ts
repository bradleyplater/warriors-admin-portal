import { readFileSync } from "node:fs";
import { getMongoClient } from "../mongodb";
import {
  createAwardEvening,
  listAwardEvenings,
  listPlayers,
  listSeasons,
} from "../repositories";
import {
  mapLegacyEvening,
  planLegacyImport,
  type LegacyAwardEvening,
} from "./legacy-import";

// npm run awards:import -- <path to awards.json> [--apply]
// One-off import of the website's hand-written public/data/awards.json into
// AwardEvening documents. A dry run unless --apply is passed. Imported
// evenings are "announced" — they've already happened.
async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const path = args.find((arg) => arg !== "--apply");
  if (!path) {
    throw new Error("Usage: awards:import -- <path to awards.json> [--apply]");
  }

  const legacy = JSON.parse(readFileSync(path, "utf8")) as LegacyAwardEvening[];
  const [seasons, players, evenings] = await Promise.all([
    listSeasons(),
    listPlayers(),
    listAwardEvenings(),
  ]);
  const plan = planLegacyImport(legacy.map(mapLegacyEvening), {
    seasonIds: new Set(seasons.map((season) => season._id)),
    playerIds: new Set(players.map((player) => player._id)),
    eveningSeasonIds: new Set(evenings.map((evening) => evening.seasonId)),
  });

  for (const step of plan) {
    if (step.action === "skip") {
      console.log(`skip   ${step.seasonId}: ${step.reason}`);
      continue;
    }
    if (apply) {
      const created = await createAwardEvening(step.seasonId, {
        status: "announced",
        entries: step.entries,
      });
      console.log(`create ${created._id}: ${created.entries.length} awards`);
    } else {
      console.log(`create ${step.seasonId}: ${step.entries.length} awards`);
    }
  }
  if (!apply) {
    console.log("Dry run. Pass --apply to write.");
  }
}

main()
  .then(async () => {
    await (await getMongoClient()).close();
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
