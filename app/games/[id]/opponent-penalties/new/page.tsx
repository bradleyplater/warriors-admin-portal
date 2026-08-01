import { notFound } from "next/navigation";
import { getGame } from "@/lib/repositories";
import { OpponentPenaltyForm } from "../../../OpponentPenaltyForm";

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
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">
        Record an opponent penalty — vs {game.opponentTeam.name}
      </h1>
      <OpponentPenaltyForm gameId={game._id} />
    </div>
  );
}
