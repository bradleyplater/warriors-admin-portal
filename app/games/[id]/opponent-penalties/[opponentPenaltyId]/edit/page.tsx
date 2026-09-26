import { notFound } from "next/navigation";
import { getGame } from "@/lib/repositories";
import { OpponentPenaltyForm } from "../../../../OpponentPenaltyForm";
import { PageHeader } from "@/app/_ui";

export default async function EditOpponentPenaltyPage({
  params,
}: {
  params: Promise<{ id: string; opponentPenaltyId: string }>;
}) {
  const { id, opponentPenaltyId } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const penalty = game.opponentTeam.penalties.find(
    (entry) => entry._id === opponentPenaltyId,
  );

  if (!penalty) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{
          href: `/games/${game._id}`,
          label: `vs ${game.opponentTeam.name}`,
        }}
        title="Edit opponent penalty"
      />
      <OpponentPenaltyForm gameId={game._id} initialValues={penalty} />
    </div>
  );
}
