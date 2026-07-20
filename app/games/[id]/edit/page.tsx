import { notFound } from "next/navigation";
import { getGame, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { GameForm } from "../../GameForm";

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

  const seasons = await listSeasons();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">
        Edit game vs {game.opponentTeam.name}
      </h1>
      <GameForm seasons={sortSeasonsAscending(seasons)} initialValues={game} />
    </div>
  );
}
