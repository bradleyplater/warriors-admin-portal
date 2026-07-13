import { listPlayers } from "@/lib/repositories";
import { PlayerForm } from "./PlayerForm";

export default async function PlayersPage() {
  const players = await listPlayers();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Players</h1>
        <PlayerForm />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Player list</h2>
        <ul className="flex flex-col gap-1">
          {players.map((player) => (
            <li key={player._id}>
              {player.firstName} {player.surname} — #{player.number}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
