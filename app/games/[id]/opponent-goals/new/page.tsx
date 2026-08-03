import { notFound } from "next/navigation";
import { getGame } from "@/lib/repositories";
import { OpponentGoalForm } from "../../../OpponentGoalForm";

export default async function NewOpponentGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">
        Record an opponent goal — vs {game.opponentTeam.name}
      </h1>
      <OpponentGoalForm gameId={game._id} />
    </div>
  );
}
