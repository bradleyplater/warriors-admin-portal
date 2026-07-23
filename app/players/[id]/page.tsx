import { notFound } from "next/navigation";
import { getPlayer, listGames, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import {
  derivePlayerSeasonStats,
  type PlayerSeasonStats,
} from "@/lib/derived/player-stats";
import { GamesTable } from "@/app/games/GamesTable";
import type { Game, Season } from "@/lib/schemas";

function SeasonSection({
  season,
  games,
  stats,
}: {
  season: Season;
  games: Game[];
  stats: PlayerSeasonStats;
}) {
  return (
    <div className="flex flex-col gap-3" data-testid={`season-${season._id}`}>
      <h3 className="text-lg font-semibold">
        {season.name} ({games.length})
      </h3>
      <dl className="grid max-w-sm grid-cols-2 gap-y-1 text-sm">
        <dt className="text-black/60 dark:text-white/60">Goals</dt>
        <dd data-testid="stat-goals">{stats.goals}</dd>
        <dt className="text-black/60 dark:text-white/60">Assists</dt>
        <dd data-testid="stat-assists">{stats.assists}</dd>
        <dt className="text-black/60 dark:text-white/60">Points</dt>
        <dd data-testid="stat-points">{stats.points}</dd>
        <dt className="text-black/60 dark:text-white/60">PIMs</dt>
        <dd data-testid="stat-pims">{stats.pims}</dd>
        <dt className="text-black/60 dark:text-white/60">Man of the Match</dt>
        <dd data-testid="stat-man-of-the-match">{stats.manOfTheMatch}</dd>
        <dt className="text-black/60 dark:text-white/60">Warrior of the Game</dt>
        <dd data-testid="stat-warrior-of-the-game">{stats.warriorOfTheGame}</dd>
      </dl>
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
            stats={derivePlayerSeasonStats(playerGames, player._id, season._id)}
          />
        ))}
      </div>
    </div>
  );
}
