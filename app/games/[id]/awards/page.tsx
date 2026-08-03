import { notFound } from "next/navigation";
import { getGame, listPlayers } from "@/lib/repositories";
import { AwardsForm } from "../../AwardsForm";

export default async function GameAwardsPage({
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
  const rosterPlayers = game.team.roster
    .map((entry) => players.find((player) => player._id === entry.playerId))
    .filter((player): player is NonNullable<typeof player> => player !== undefined)
    .sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">
        Manage awards — vs {game.opponentTeam.name}
      </h1>
      <AwardsForm game={game} rosterPlayers={rosterPlayers} />
    </div>
  );
}
