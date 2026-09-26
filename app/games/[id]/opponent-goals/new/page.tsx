import { notFound } from "next/navigation";
import { getGame } from "@/lib/repositories";
import { OpponentGoalForm } from "../../../OpponentGoalForm";
import { PageHeader } from "@/app/_ui";
import { getOpponentName } from "@/lib/opponents/names";

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

  const opponentName = await getOpponentName(game.opponentTeam.opponentId);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{
          href: `/games/${game._id}`,
          label: `vs ${opponentName}`,
        }}
        title="Record opponent goal"
      >
        The period is worked out from the time you enter.
      </PageHeader>
      <OpponentGoalForm gameId={game._id} />
    </div>
  );
}
