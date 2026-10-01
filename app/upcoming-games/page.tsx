import Link from "next/link";
import { listUpcomingGames } from "@/lib/repositories";
import { getOpponentNamesById, opponentNameFrom } from "@/lib/opponents/names";
import { formatTime12h, todayInLondon } from "@/lib/upcoming-games/time";
import { competitionLabel } from "@/lib/publish/artifacts/competition";
import type { UpcomingGame } from "@/lib/schemas";
import {
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
} from "@/app/_ui";

// No dynamic route segment, so Next would otherwise prerender this page at
// build time — and the Upcoming/Past split depends on today's date anyway.
export const dynamic = "force-dynamic";

function UpcomingGamesTable({
  games,
  opponentNames,
}: {
  games: UpcomingGame[];
  opponentNames: Map<string, string>;
}) {
  if (games.length === 0) {
    return <EmptyState>None.</EmptyState>;
  }

  return (
    <Card flush>
      <table className="wr-table">
        <thead>
          <tr>
            <th className="w-32">Date</th>
            <th className="w-24">Time</th>
            <th>Opponent</th>
            <th className="w-32">Competition</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => {
            const opponentName = opponentNameFrom(opponentNames, game.opponentId);
            return (
              <tr key={game._id} className="relative">
                <td className="wr-num">
                  {/* Whole-row hit target; the opponent is styled as the
                      visible link. */}
                  <Link
                    href={`/upcoming-games/${game._id}/edit`}
                    className="absolute inset-0"
                    aria-label={`Edit game against ${opponentName} on ${game.date}`}
                  />
                  {game.date}
                </td>
                <td className="wr-num">{formatTime12h(game.time)}</td>
                <td>
                  <span className="text-[color:var(--link)] underline underline-offset-[.15em]">
                    {opponentName}
                  </span>{" "}
                  <span className="t-label text-fg-secondary">
                    · {game.location === "HOME" ? "Home" : `Away, ${game.venue}`}
                  </span>
                </td>
                <td className="t-label text-fg-secondary">
                  {competitionLabel(game.type)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

export default async function UpcomingGamesPage() {
  const [games, opponentNames] = await Promise.all([
    listUpcomingGames(),
    getOpponentNamesById(),
  ]);

  // Listed soonest first; past games read better most recent first.
  const today = todayInLondon();
  const upcoming = games.filter((game) => game.date >= today);
  const past = games.filter((game) => game.date < today).reverse();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Upcoming games"
        actions={
          <ButtonLink href="/upcoming-games/new">Add upcoming game</ButtonLink>
        }
      >
        The fixture list published to the website. Only games from today
        onwards are published.
      </PageHeader>

      {games.length === 0 ? (
        <EmptyState>
          No upcoming games yet.{" "}
          <Link href="/upcoming-games/new">Add one</Link>.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-4" data-testid="upcoming-section">
            <SectionHeading count={`${upcoming.length}`}>Upcoming</SectionHeading>
            <UpcomingGamesTable games={upcoming} opponentNames={opponentNames} />
          </div>
          {past.length > 0 && (
            <div className="flex flex-col gap-4" data-testid="past-section">
              <SectionHeading count={`${past.length}`}>Past</SectionHeading>
              <p className="m-0 text-fg-secondary">
                No longer published. Delete them once you no longer need them.
              </p>
              <UpcomingGamesTable games={past} opponentNames={opponentNames} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
