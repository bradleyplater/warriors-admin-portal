import { notFound } from "next/navigation";
import { getGame, listPlayers } from "@/lib/repositories";
import { GoalForm } from "../../../../GoalForm";

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string; goalId: string }>;
}) {
  const { id, goalId } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const goal = game.team.goals.find((entry) => entry._id === goalId);

  if (!goal) {
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
        Edit goal — vs {game.opponentTeam.name}
      </h1>
      <GoalForm gameId={game._id} rosterPlayers={rosterPlayers} initialValues={goal} />
    </div>
  );
}
