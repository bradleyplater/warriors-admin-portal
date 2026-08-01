import { notFound } from "next/navigation";
import { getGame } from "@/lib/repositories";
import { OpponentGoalForm } from "../../../../OpponentGoalForm";

export default async function EditOpponentGoalPage({
  params,
}: {
  params: Promise<{ id: string; opponentGoalId: string }>;
}) {
  const { id, opponentGoalId } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const goal = game.opponentTeam.goals.find(
    (entry) => entry._id === opponentGoalId,
  );

  if (!goal) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">
        Edit opponent goal — vs {game.opponentTeam.name}
      </h1>
      <OpponentGoalForm gameId={game._id} initialValues={goal} />
    </div>
  );
}
