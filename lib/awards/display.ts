import {
  AWARD_CATEGORIES,
  type AwardCompetition,
  type AwardEntry,
  type AwardEveningStatus,
} from "../schemas";

// The award's shown name: its category's, or the one typed for a one-off.
export function awardName(
  entry: Pick<AwardEntry, "category" | "customName">,
): string {
  if (entry.category) {
    return AWARD_CATEGORIES[entry.category].name;
  }
  return entry.customName ?? "";
}

// Awards are labelled BOTB, not the stored BOTBC game type.
const COMPETITION_LABELS: Record<AwardCompetition, string> = {
  BOTBC: "BOTB",
  LLIHC: "LLIHC",
};

export function awardCompetitionLabel(
  competition: AwardCompetition | undefined,
): string {
  return competition ? COMPETITION_LABELS[competition] : "Club-wide";
}

export const AWARD_STATUS_LABELS: Record<
  AwardEveningStatus,
  { label: string; description: string }
> = {
  draft: {
    label: "Draft",
    description: "Not on the website.",
  },
  categories: {
    label: "Awards listed",
    description: "On the website with every winner shown as “To be announced”.",
  },
  announced: {
    label: "Announced",
    description: "On the website with its winners.",
  },
};
