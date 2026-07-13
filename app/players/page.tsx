import Link from "next/link";
import { listPlayers } from "@/lib/repositories";
import type { Player } from "@/lib/schemas";

function RosterTable({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">None.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-black/10 dark:border-white/15">
          <th className="py-2 pr-4 font-medium">#</th>
          <th className="py-2 pr-4 font-medium">Name</th>
          <th className="py-2 pr-4 font-medium">Position(s)</th>
          <th className="py-2 pr-4 font-medium">Nickname</th>
        </tr>
      </thead>
      <tbody>
        {players.map((player) => (
          <tr
            key={player._id}
            className="border-b border-black/5 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
          >
            <td className="py-2 pr-4">{player.number}</td>
            <td className="py-2 pr-4">
              {player.firstName} {player.surname}
            </td>
            <td className="py-2 pr-4">{player.positions.join(", ")}</td>
            <td className="py-2 pr-4">{player.nickname ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function PlayersPage() {
  const players = await listPlayers();
  const active = players
    .filter((player) => player.active)
    .sort((a, b) => a.number - b.number);
  const inactive = players
    .filter((player) => !player.active)
    .sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Players</h1>
        <Link
          href="/players/new"
          className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
        >
          Add new player
        </Link>
      </div>

      <div className="flex flex-col gap-3" data-testid="active-section">
        <h2 className="text-xl font-semibold">Active ({active.length})</h2>
        <RosterTable players={active} />
      </div>

      <div className="flex flex-col gap-3" data-testid="inactive-section">
        <h2 className="text-xl font-semibold">Inactive ({inactive.length})</h2>
        <RosterTable players={inactive} />
      </div>
    </div>
  );
}
