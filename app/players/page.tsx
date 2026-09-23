import Link from "next/link";
import { listPlayers } from "@/lib/repositories";
import { compareByShirtNumber } from "@/lib/derived/player-order";
import type { Player } from "@/lib/schemas";
import {
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
} from "@/app/_ui";

function RosterTable({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return <EmptyState>None.</EmptyState>;
  }

  return (
    <Card flush>
      <table className="wr-table">
        <thead>
          <tr>
            <th className="w-16">#</th>
            <th>Name</th>
            <th>Position(s)</th>
            <th>Nickname</th>
            <th className="wr-right w-24">Edit</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player._id} className="relative">
              <td className="wr-num">
                {/* Whole-row hit target; the name below is styled as the
                    visible link. */}
                <Link
                  href={`/players/${player._id}`}
                  className="absolute inset-0"
                  aria-label={`View ${player.firstName} ${player.surname}`}
                />
                {player.number ?? "—"}
              </td>
              <td>
                <span className="text-[color:var(--link)] underline underline-offset-[.15em]">
                  {player.firstName} {player.surname}
                </span>
              </td>
              <td className="t-label text-fg-secondary">
                {player.positions.join(", ")}
              </td>
              <td>{player.nickname ?? "—"}</td>
              <td className="wr-right">
                <ButtonLink
                  href={`/players/${player._id}/edit`}
                  variant="secondary"
                  size="sm"
                  className="relative z-10"
                >
                  Edit
                  <span className="sr-only">
                    {" "}
                    {player.firstName} {player.surname}
                  </span>
                </ButtonLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default async function PlayersPage() {
  const players = await listPlayers();
  const active = players
    .filter((player) => player.active)
    .sort(compareByShirtNumber);
  const inactive = players
    .filter((player) => !player.active)
    .sort(compareByShirtNumber);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Database"
        title="Players"
        actions={<ButtonLink href="/players/new">Add new player</ButtonLink>}
      />

      <div className="flex flex-col gap-4" data-testid="active-section">
        <SectionHeading count={active.length}>Active</SectionHeading>
        <RosterTable players={active} />
      </div>

      <div className="flex flex-col gap-4" data-testid="inactive-section">
        <SectionHeading count={inactive.length}>Inactive</SectionHeading>
        <RosterTable players={inactive} />
      </div>
    </div>
  );
}
