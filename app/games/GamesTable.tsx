import Link from "next/link";
import { deriveScore } from "@/lib/derived/score";
import type { Game } from "@/lib/schemas";

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function GamesTable({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">None.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-black/10 dark:border-white/15">
          <th className="py-2 pr-4 font-medium">Date</th>
          <th className="py-2 pr-4 font-medium">Opponent</th>
          <th className="py-2 pr-4 font-medium">Score</th>
        </tr>
      </thead>
      <tbody>
        {games.map((game) => {
          const score = deriveScore(game.team.goals, game.opponentTeam.goals);
          return (
            <tr
              key={game._id}
              className="relative border-b border-black/5 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
            >
              <td className="py-2 pr-4">
                <Link
                  href={`/games/${game._id}`}
                  className="absolute inset-0"
                  aria-label={`View game against ${game.opponentTeam.name} on ${formatDate(game.date)}`}
                />
                {formatDate(game.date)}
              </td>
              <td className="py-2 pr-4">{game.opponentTeam.name}</td>
              <td className="py-2 pr-4">
                {score.team}-{score.opponent}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
