import { notFound } from "next/navigation";
import { getGame, listPlayers } from "@/lib/repositories";
import { compareByShirtNumber } from "@/lib/derived/player-order";
import { GoalForm } from "../../../GoalForm";
import { PageHeader } from "@/app/_ui";

export default async function NewGoalPage({
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
        title="Record goal"
      >
        Scorer and assists are limited to the players dressed for this game. The
        period is worked out from the time you enter.
      </PageHeader>
      <GoalForm gameId={game._id} rosterPlayers={rosterPlayers} />
    </div>
  );
}
