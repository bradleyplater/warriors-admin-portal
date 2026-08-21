import type { Position } from "../../schemas";

// Deterministic mapping from the legacy free-text `position` field to the
// target `positions` array — the 8 real-world spellings documented in
// docs/04-migration-plan.md, extracted from production data on 2026-07-04.
const LEGACY_POSITION_MAP: Record<string, Position[]> = {
  Forward: ["Forward"],
  Defence: ["Defence"],
  Goaltender: ["Goaltender"],
  "Forward / Defence": ["Forward", "Defence"],
  "Defence / Forward": ["Defence", "Forward"],
  "Defence / Goaltender": ["Defence", "Goaltender"],
  "Defence/Goaltender": ["Defence", "Goaltender"],
  "Goalie / Defence": ["Goaltender", "Defence"],
};

// Throws rather than guessing — an unmapped spelling is a data problem to
// surface and resolve, not something the migration should paper over
// (docs/04-migration-plan.md rule 4: "Nothing is overwritten without
// sign-off").
export function mapLegacyPosition(value: string): Position[] {
  const mapped = LEGACY_POSITION_MAP[value];
  if (!mapped) {
    throw new Error(`Unmapped legacy position spelling: "${value}"`);
  }
  return mapped;
}
