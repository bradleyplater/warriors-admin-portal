import { listGames, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { ButtonLink, PageHeader, SectionHeading } from "@/app/_ui";
import { GamesTable } from "./GamesTable";
import type { Game, Season } from "@/lib/schemas";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the games list to whatever the
// database held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

function SeasonSection({ season, games }: { season: Season; games: Game[] }) {
  const seasonGames = games
    .filter((game) => game.seasonId === season._id)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="flex flex-col gap-4" data-testid={`season-${season._id}`}>
      <SectionHeading
        count={`${seasonGames.length} ${seasonGames.length === 1 ? "game" : "games"}`}
        countTestId="season-count"
      >
        {season.name}
      </SectionHeading>
      <GamesTable games={seasonGames} />
    </div>
  );
}

export default async function GamesPage() {
  const [games, seasons] = await Promise.all([listGames(), listSeasons()]);
  const orderedSeasons = sortSeasonsAscending(seasons).reverse();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Database"
        title="Games"
        actions={<ButtonLink href="/games/new">Add game</ButtonLink>}
      />

      {orderedSeasons.map((season) => (
        <SeasonSection key={season._id} season={season} games={games} />
      ))}
    </div>
  );
}
