import { listOpponents, listPlayers, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { compareByShirtNumber } from "@/lib/derived/player-order";
import { PageHeader } from "@/app/_ui";
import { GameImport, type ImportPlayerOption } from "./GameImport";

// Per-request, so the pickers reflect players/opponents/seasons added since
// the server started (same reason as /games/new).
export const dynamic = "force-dynamic";

export default async function ImportGamePage() {
  const [players, seasons, opponents] = await Promise.all([
    listPlayers(),
    listSeasons(),
    listOpponents(),
  ]);

  // Active players first by shirt number, then inactive by surname — an
  // inactive player can still be credited without reactivating them.
  const active = players.filter((p) => p.active).sort(compareByShirtNumber);
  const inactive = players
    .filter((p) => !p.active)
    .sort((a, b) => a.surname.localeCompare(b.surname));
  const playerOptions: ImportPlayerOption[] = [...active, ...inactive].map(
    (player) => ({
      id: player._id,
      name: `${player.firstName} ${player.surname}`,
      number: player.number ?? null,
      active: player.active,
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/games", label: "Games" }}
        title="Import game from CSV"
      >
        Export a game tab from the season workbook as CSV and upload it. Nothing
        is saved until you click Save to database.
      </PageHeader>
      <GameImport
        players={playerOptions}
        opponents={[...opponents]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((o) => ({ id: o._id, name: o.name }))}
        seasons={sortSeasonsAscending(seasons)
          .reverse()
          .map((s) => ({ id: s._id, name: s.name }))}
      />
    </div>
  );
}
