import type { Player } from "@/lib/schemas";

function FieldErrors({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {messages.map((message) => (
        <p key={message} className="text-sm text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}

function playerLabel(player: Player): string {
  return `#${player.number} ${player.firstName} ${player.surname}`;
}

type RosterSelectProps = {
  id: string;
  name: string;
  label: string;
  rosterPlayers: Player[];
  defaultValue?: string;
  errors?: string[];
};

// Shared by AwardsForm (Player of the Game, Warrior of the Game) and
// GameForm's netminder field — same optional, roster-scoped, clearable
// select, just a different field.
export function RosterSelect({
  id,
  name,
  label,
  rosterPlayers,
  defaultValue,
  errors,
}: RosterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
      >
        <option value="">None</option>
        {rosterPlayers.map((player) => (
          <option key={player._id} value={player._id}>
            {playerLabel(player)}
          </option>
        ))}
      </select>
      <FieldErrors messages={errors} />
    </div>
  );
}
