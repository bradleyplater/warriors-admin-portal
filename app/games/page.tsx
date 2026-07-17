import Link from "next/link";
import { listGames, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { GamesTable } from "./GamesTable";
import type { Game, Season } from "@/lib/schemas";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the games list to whatever the
// database held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

function SeasonSection({ season, games }: { season: Season; games: Game[] }) {
  const seasonGames = games
    .filter((game) => game.seasonId === season._id)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="flex flex-col gap-3" data-testid={`season-${season._id}`}>
      <h2 className="text-xl font-semibold">
        {season.name} ({seasonGames.length})
      </h2>
      <GamesTable games={seasonGames} />
    </div>
  );
}

export default async function GamesPage() {
  const [games, seasons] = await Promise.all([listGames(), listSeasons()]);
  const orderedSeasons = sortSeasonsAscending(seasons);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Games</h1>
        <Link
          href="/games/new"
          className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
        >
          Add game
        </Link>
      </div>

      {orderedSeasons.map((season) => (
        <SeasonSection key={season._id} season={season} games={games} />
      ))}
    </div>
  );
}
