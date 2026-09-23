import { notFound } from "next/navigation";
import { getGame } from "@/lib/repositories";
import { OpponentPenaltyForm } from "../../../OpponentPenaltyForm";
import { PageHeader } from "@/app/_ui";

export default async function NewOpponentPenaltyPage({
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
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{
          href: `/games/${game._id}`,
          label: `vs ${game.opponentTeam.name}`,
        }}
        title="Record opponent penalty"
      />
      <OpponentPenaltyForm gameId={game._id} />
    </div>
  );
}
