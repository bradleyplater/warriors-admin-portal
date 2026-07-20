import { notFound } from "next/navigation";
import { getGame, listPlayers } from "@/lib/repositories";
import { RosterForm } from "../../RosterForm";

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
    .sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">
        Manage roster — vs {game.opponentTeam.name}
      </h1>
      <RosterForm game={game} pickerPlayers={pickerPlayers} />
    </div>
  );
}
