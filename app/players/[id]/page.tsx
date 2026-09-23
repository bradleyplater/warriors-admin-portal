import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, listGames, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import {
  derivePlayerSeasonStats,
  type PlayerSeasonStats,
} from "@/lib/derived/player-stats";
import { formatDate } from "@/app/games/GamesTable";
import { ButtonLink, Card, PageHeader, SectionHeading } from "@/app/_ui";
import type { Game, Season } from "@/lib/schemas";

const SEASON_STATS: {
  key: keyof Omit<PlayerSeasonStats, "gamesPlayed">;
  label: string;
  testId: string;
}[] = [
  { key: "goals", label: "Goals", testId: "stat-goals" },
  { key: "assists", label: "Assists", testId: "stat-assists" },
  { key: "points", label: "Points", testId: "stat-points" },
  { key: "pims", label: "PIM", testId: "stat-pims" },
  {
    key: "manOfTheMatch",
    label: "Player of the Game",
    testId: "stat-man-of-the-match",
  },
  {
    key: "warriorOfTheGame",
    label: "Warrior of the Game",
    testId: "stat-warrior-of-the-game",
  },
];

function SeasonSection({
  playerId,
  season,
  games,
  stats,
}: {
  playerId: string;
  season: Season;
  games: Game[];
  stats: PlayerSeasonStats;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid={`season-${season._id}`}>
      <SectionHeading
        count={`${stats.gamesPlayed} ${stats.gamesPlayed === 1 ? "game" : "games"} played`}
        countTestId="season-count"
      >
        {season.name}
      </SectionHeading>

      {/* StatGrid (data/StatGrid): label over an expanded-display figure. */}
      <Card>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-5">
          {SEASON_STATS.map((stat) => (
            <div key={stat.key} className="flex flex-col gap-1">
              <dt className="t-label text-fg-secondary">{stat.label}</dt>
              <dd
                className="t-display m-0 text-[1.75rem] tabular-nums"
                data-testid={stat.testId}
              >
                {stats[stat.key]}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {games.length > 0 && (
        <Card flush>
          <table className="wr-table">
            <thead>
              <tr>
                <th className="w-32">Date</th>
                <th>Opponent</th>
                <th className="wr-right w-16">G</th>
                <th className="wr-right w-16">A</th>
                <th className="wr-right w-16">PTS</th>
                <th className="wr-right w-16">PIM</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => {
                // One game's line is the season derivation over just that
                // game, so the per-game and season figures can't disagree.
                const line = derivePlayerSeasonStats(
                  [game],
                  playerId,
                  game.seasonId,
                );
                return (
                  <tr key={game._id}>
                    <td className="wr-num">{formatDate(game.date)}</td>
                    <td>
                      <Link href={`/games/${game._id}`}>
                        {game.opponentTeam.name}
                      </Link>
                    </td>
                    <td className="wr-num wr-right">{line.goals}</td>
                    <td className="wr-num wr-right">{line.assists}</td>
                    <td className="wr-num wr-right wr-strong">{line.points}</td>
                    <td className="wr-num wr-right">{line.pims}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
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
    <div className="flex flex-col gap-10">
      <PageHeader
        back={{ href: "/players", label: "Players" }}
        title={
          <span className="flex items-baseline gap-4">
            <span className="t-data text-[length:var(--wr-text-h2)] text-fg-secondary">
              {player.number ?? "—"}
            </span>
            {player.firstName} {player.surname}
          </span>
        }
        meta={
          <span className="t-label">
            {player.positions.join(", ")} ·{" "}
            {player.active ? "Active" : "Inactive"}
          </span>
        }
        actions={
          <ButtonLink href={`/players/${player._id}/edit`} variant="secondary">
            Edit player
          </ButtonLink>
        }
      />

      {orderedSeasons.map((season) => (
        <SeasonSection
          key={season._id}
          playerId={player._id}
          season={season}
          games={playerGames
            .filter((game) => game.seasonId === season._id)
            .sort((a, b) => a.date.getTime() - b.date.getTime())}
          stats={derivePlayerSeasonStats(games, player._id, season._id)}
        />
      ))}
    </div>
  );
}
