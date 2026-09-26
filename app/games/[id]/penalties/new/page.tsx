import { notFound } from "next/navigation";
import { getGame, listPlayers } from "@/lib/repositories";
import { compareByShirtNumber } from "@/lib/derived/player-order";
import { PenaltyForm } from "../../../PenaltyForm";
import { PageHeader } from "@/app/_ui";

export default async function NewPenaltyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const players = await listPlayers();
  const rosterPlayers = game.team.roster
    .map((entry) => players.find((player) => player._id === entry.playerId))
    .filter(
      (player): player is NonNullable<typeof player> => player !== undefined,
    )
    .sort(compareByShirtNumber);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{
          href: `/games/${game._id}`,
          label: `vs ${game.opponentTeam.name}`,
        }}
        title="Record penalty"
      />
      <PenaltyForm gameId={game._id} rosterPlayers={rosterPlayers} />
    </div>
  );
}
