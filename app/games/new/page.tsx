import { listPlayers, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { GameForm } from "../GameForm";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the roster/season pickers to whatever
// the database held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  const [players, seasons] = await Promise.all([listPlayers(), listSeasons()]);
  const activePlayers = players
    .filter((player) => player.active)
    .sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Add game</h1>
      <GameForm seasons={sortSeasonsAscending(seasons)} activePlayers={activePlayers} />
    </div>
  );
}
