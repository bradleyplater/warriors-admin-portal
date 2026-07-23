import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, getSeason, listPlayers } from "@/lib/repositories";
import { deriveScore } from "@/lib/derived/score";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const [season, players] = await Promise.all([
    getSeason(game.seasonId),
    listPlayers(),
  ]);

  const rosterPlayers = game.team.roster
    .map((entry) => players.find((player) => player._id === entry.playerId))
    .filter((player): player is NonNullable<typeof player> => player !== undefined);

  const score = deriveScore(game.team.goals, game.opponentTeam.goals);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          vs {game.opponentTeam.name} — {score.team}-{score.opponent}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/games/${game._id}/edit`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Edit details
          </Link>
          <Link
            href={`/games/${game._id}/roster`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Manage roster
          </Link>
        </div>
      </div>

      <dl className="grid max-w-md grid-cols-2 gap-y-2 text-sm">
        <dt className="text-black/60 dark:text-white/60">Date</dt>
        <dd>{game.date.toISOString().slice(0, 10)}</dd>

        <dt className="text-black/60 dark:text-white/60">Season</dt>
        <dd>{season?.name ?? game.seasonId}</dd>

        <dt className="text-black/60 dark:text-white/60">Type</dt>
        <dd>{game.type}</dd>

        <dt className="text-black/60 dark:text-white/60">Location</dt>
        <dd>{game.location === "HOME" ? "Home" : "Away"}</dd>
      </dl>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          Roster ({rosterPlayers.length})
        </h2>
        {rosterPlayers.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">None.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {rosterPlayers.map((player) => (
              <li key={player._id}>
                #{player.number} {player.firstName} {player.surname}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
