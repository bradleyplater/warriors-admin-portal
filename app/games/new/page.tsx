import { listPlayers, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { compareByShirtNumber } from "@/lib/derived/player-order";
import { PageHeader } from "@/app/_ui";
import { GameForm } from "../GameForm";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the roster/season pickers to whatever
// the database held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  const [players, seasons] = await Promise.all([listPlayers(), listSeasons()]);
  const activePlayers = players
    .filter((player) => player.active)
    .sort(compareByShirtNumber);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader back={{ href: "/games", label: "Games" }} title="Add game" />
      <GameForm
        seasons={sortSeasonsAscending(seasons)}
        activePlayers={activePlayers}
      />
    </div>
  );
}
