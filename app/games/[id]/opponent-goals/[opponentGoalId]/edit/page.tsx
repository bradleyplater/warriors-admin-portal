import { notFound } from "next/navigation";
import { getGame } from "@/lib/repositories";
import { OpponentGoalForm } from "../../../../OpponentGoalForm";
import { PageHeader } from "@/app/_ui";
import { getOpponentName } from "@/lib/opponents/names";

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

  const opponentName = await getOpponentName(game.opponentTeam.opponentId);

  const goal = game.opponentTeam.goals.find(
    (entry) => entry._id === opponentGoalId,
  );

  if (!goal) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{
          href: `/games/${game._id}`,
          label: `vs ${opponentName}`,
        }}
        title="Edit opponent goal"
      />
      <OpponentGoalForm gameId={game._id} initialValues={goal} />
    </div>
  );
}
