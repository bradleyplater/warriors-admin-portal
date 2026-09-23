import Link from "next/link";
import { deriveScore, type Score } from "@/lib/derived/score";
import type { Game } from "@/lib/schemas";
import { Badge, Card, EmptyState, type Tone } from "@/app/_ui";

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Scores use a spaced em dash in this system: "4 — 2".
export function formatScore(score: Pick<Score, "team" | "opponent">): string {
  return `${score.team} — ${score.opponent}`;
}

function result(score: Score): { tone: Tone; label: string } {
  // deriveScore already folds a decisive shootout into the totals; flag it
  // so a 2 — 1 decided on penalties doesn't read as a regulation win.
  const decidedByShootout =
    score.shootout !== null && score.shootout.team !== score.shootout.opponent;
  if (decidedByShootout) return { tone: "info", label: "Shootout" };
  if (score.team > score.opponent) return { tone: "success", label: "Won" };
  if (score.team < score.opponent) return { tone: "danger", label: "Lost" };
  return { tone: "neutral", label: "Drew" };
}

export function GamesTable({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return <EmptyState>None.</EmptyState>;
  }

  return (
    <Card flush>
      <table className="wr-table">
        <thead>
          <tr>
            <th className="w-32">Date</th>
            <th>Opponent</th>
            <th className="w-28">Score</th>
            <th className="w-32">Type</th>
            <th className="wr-right w-28">Result</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => {
            const score = deriveScore(game.team.goals, game.opponentTeam.goals);
            const { tone, label } = result(score);
            return (
              <tr key={game._id} className="relative">
                <td className="wr-num">
                  {/* Whole-row hit target; the opponent is styled as the
                      visible link. */}
                  <Link
                    href={`/games/${game._id}`}
                    className="absolute inset-0"
                    aria-label={`View game against ${game.opponentTeam.name} on ${formatDate(game.date)}`}
                  />
                  {formatDate(game.date)}
                </td>
                <td>
                  <span className="text-[color:var(--link)] underline underline-offset-[.15em]">
                    {game.opponentTeam.name}
                  </span>{" "}
                  <span className="t-label text-fg-secondary">
                    · {game.location === "HOME" ? "Home" : "Away"}
                  </span>
                </td>
                <td className="wr-num wr-strong">{formatScore(score)}</td>
                <td className="t-label text-fg-secondary">{game.type}</td>
                <td className="wr-right">
                  <Badge tone={tone}>{label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
