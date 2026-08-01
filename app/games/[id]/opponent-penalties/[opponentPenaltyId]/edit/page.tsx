import { notFound } from "next/navigation";
import { getGame } from "@/lib/repositories";
import { OpponentPenaltyForm } from "../../../../OpponentPenaltyForm";

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
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">
        Edit opponent penalty — vs {game.opponentTeam.name}
      </h1>
      <OpponentPenaltyForm gameId={game._id} initialValues={penalty} />
    </div>
  );
}
