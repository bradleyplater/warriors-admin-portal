import { TextField } from "@/app/_ui";
import type { GameFormState } from "./form-state";

// The minute/second pair every goal and penalty form shares. The period is
// derived from the minute, so nothing else about game time is entered.
export function TimeFields({
  errors,
  initialValues,
}: {
  errors: GameFormState["errors"];
  initialValues?: { minute: number; second: number };
}) {
  return (
    <div className="flex gap-4">
      <TextField
        id="minute"
        name="minute"
        label="Minute"
        type="number"
        min={0}
        defaultValue={initialValues?.minute}
        errors={errors.minute}
        className="w-28"
      />
      <TextField
        id="second"
        name="second"
        label="Second"
        type="number"
        min={0}
        max={59}
        defaultValue={initialValues?.second}
        errors={errors.second}
        className="w-28"
      />
    </div>
  );
}
