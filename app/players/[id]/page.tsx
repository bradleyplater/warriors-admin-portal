import { notFound } from "next/navigation";
import { getPlayer, listGames, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { GamesTable } from "@/app/games/GamesTable";
import type { Game, Season } from "@/lib/schemas";

function SeasonSection({ season, games }: { season: Season; games: Game[] }) {
  return (
    <div className="flex flex-col gap-3" data-testid={`season-${season._id}`}>
      <h3 className="text-lg font-semibold">
        {season.name} ({games.length})
      </h3>
      <GamesTable games={games} />
    </div>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayer(id);

  if (!player) {
    notFound();
  }

  const [games, seasons] = await Promise.all([listGames(), listSeasons()]);
  const playerGames = games.filter((game) =>
    game.team.roster.some((entry) => entry.playerId === player._id),
  );
  const orderedSeasons = sortSeasonsAscending(seasons);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          #{player.number} {player.firstName} {player.surname}
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {player.positions.join(", ")}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {orderedSeasons.map((season) => (
          <SeasonSection
            key={season._id}
            season={season}
            games={playerGames
              .filter((game) => game.seasonId === season._id)
              .sort((a, b) => a.date.getTime() - b.date.getTime())}
          />
        ))}
      </div>
    </div>
  );
}
