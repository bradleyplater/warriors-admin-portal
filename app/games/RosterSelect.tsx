import type { Player } from "@/lib/schemas";
import { SelectField } from "@/app/_ui";

function playerLabel(player: Player): string {
  return `#${player.number ?? "—"} ${player.firstName} ${player.surname}`;
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
    <SelectField
      id={id}
      name={name}
      label={label}
      defaultValue={defaultValue ?? ""}
      errors={errors}
    >
      <option value="">None</option>
      {rosterPlayers.map((player) => (
        <option key={player._id} value={player._id}>
          {playerLabel(player)}
        </option>
      ))}
    </SelectField>
  );
}
