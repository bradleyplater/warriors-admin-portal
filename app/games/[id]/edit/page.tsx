import { notFound } from "next/navigation";
import { getGame, listPlayers, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { compareByShirtNumber } from "@/lib/derived/player-order";
import { GameForm } from "../../GameForm";
import { PageHeader } from "@/app/_ui";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const [seasons, players] = await Promise.all([listSeasons(), listPlayers()]);
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
        title="Edit game details"
      />
      <GameForm
        seasons={sortSeasonsAscending(seasons)}
        rosterPlayers={rosterPlayers}
        initialValues={game}
      />
    </div>
  );
}
