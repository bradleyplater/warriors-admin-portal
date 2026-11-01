import type { AwardEveningStatus } from "@/lib/schemas";
import type { Tone } from "@/app/_ui";

export const STATUS_TONES: Record<AwardEveningStatus, Tone> = {
  draft: "neutral",
  categories: "info",
  announced: "success",
};
