import { notFound } from "next/navigation";
import { getGame, listPlayers } from "@/lib/repositories";
import { compareByShirtNumber } from "@/lib/derived/player-order";
import { RosterForm } from "../../RosterForm";
import { PageHeader } from "@/app/_ui";

export default async function GameRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const players = await listPlayers();
  const rosteredIds = new Set(game.team.roster.map((entry) => entry.playerId));
  const pickerPlayers = players
    .filter((player) => player.active || rosteredIds.has(player._id))
    .sort(compareByShirtNumber);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{
          href: `/games/${game._id}`,
          label: `vs ${game.opponentTeam.name}`,
        }}
        title="Manage roster"
      />
      <RosterForm game={game} pickerPlayers={pickerPlayers} />
    </div>
  );
}
