import {
  AwardCategorySchema,
  AwardCompetitionSchema,
  MAX_AWARD_TEXT_LENGTH,
  type AwardCategory,
  type AwardCompetition,
} from "../schemas";
import type { AwardEntryInput } from "../repositories";

// The award <select>'s value for "type a one-off name instead".
export const CUSTOM_AWARD = "custom";

export type AwardEntryFormErrors = Partial<
  Record<"award" | "customName" | "competition" | "winners" | "note", string[]>
>;

export type ParsedAwardEntryForm =
  | { ok: true; input: AwardEntryInput }
  | { ok: false; errors: AwardEntryFormErrors };

function text(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function tooLong(value: string | undefined): boolean {
  return value !== undefined && value.length > MAX_AWARD_TEXT_LENGTH;
}

const TOO_LONG = `Must be ${MAX_AWARD_TEXT_LENGTH} characters or fewer`;

// The add/edit award form. Winners must be players that exist — the caller
// passes their ids, since checking needs the database.
export function parseAwardEntryForm(
  formData: FormData,
  knownPlayerIds: ReadonlySet<string>,
): ParsedAwardEntryForm {
  const errors: AwardEntryFormErrors = {};

  const award = text(formData.get("award"));
  const customName = text(formData.get("customName"));
  let category: AwardCategory | undefined;
  if (award === undefined) {
    errors.award = ["Choose an award"];
  } else if (award === CUSTOM_AWARD) {
    if (customName === undefined) {
      errors.customName = ["Enter the award's name"];
    } else if (tooLong(customName)) {
      errors.customName = [TOO_LONG];
    }
  } else {
    const parsed = AwardCategorySchema.safeParse(award);
    if (parsed.success) {
      category = parsed.data;
    } else {
      errors.award = ["Choose an award from the list"];
    }
  }

  const competitionValue = text(formData.get("competition"));
  let competition: AwardCompetition | undefined;
  if (competitionValue !== undefined) {
    const parsed = AwardCompetitionSchema.safeParse(competitionValue);
    if (parsed.success) {
      competition = parsed.data;
    } else {
      errors.competition = ["Choose BOTB, LLIHC or club-wide"];
    }
  }

  // Duplicates collapse silently; the form can't submit one twice anyway.
  const winners = [
    ...new Set(
      formData
        .getAll("winners")
        .filter((value): value is string => typeof value === "string"),
    ),
  ];
  if (winners.some((id) => !knownPlayerIds.has(id))) {
    errors.winners = ["Choose winners from the player list"];
  }

  const note = text(formData.get("note"));
  if (tooLong(note)) {
    errors.note = [TOO_LONG];
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    input: {
      ...(category ? { category } : { customName }),
      ...(competition && { competition }),
      winners,
      ...(note && { note }),
    },
  };
}
