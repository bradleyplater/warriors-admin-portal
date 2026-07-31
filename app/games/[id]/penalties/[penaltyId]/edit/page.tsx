import { notFound } from "next/navigation";
import { getGame, listPlayers } from "@/lib/repositories";
import { PenaltyForm } from "../../../../PenaltyForm";

export default async function EditPenaltyPage({
  params,
}: {
  params: Promise<{ id: string; penaltyId: string }>;
}) {
  const { id, penaltyId } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const penalty = game.team.penalties.find((entry) => entry._id === penaltyId);

  if (!penalty) {
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
        Edit penalty — vs {game.opponentTeam.name}
      </h1>
      <PenaltyForm gameId={game._id} rosterPlayers={rosterPlayers} initialValues={penalty} />
    </div>
  );
}
