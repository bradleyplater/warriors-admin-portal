import { notFound } from "next/navigation";
import { getGame, listPlayers } from "@/lib/repositories";
import { GoalForm } from "../../../GoalForm";

export default async function NewGoalPage({
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
        Record a goal — vs {game.opponentTeam.name}
      </h1>
      <GoalForm gameId={game._id} rosterPlayers={rosterPlayers} />
    </div>
  );
}
