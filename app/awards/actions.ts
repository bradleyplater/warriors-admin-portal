"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addAwardEntries,
  addAwardEntry,
  createAwardEvening,
  DuplicateAwardEveningError,
  getAwardEvening,
  getSeason,
  listGames,
  listPlayers,
  moveAwardEntry,
  setAwardEveningStatus,
  updateAwardEntry,
} from "@/lib/repositories";
import { AwardEveningStatusSchema } from "@/lib/schemas";
import { parseAwardEntryForm } from "@/lib/awards/entry-form";
import { standardAwardEntries } from "@/lib/awards/standard-set";
import { awardStat, statAwardLeader } from "@/lib/awards/stat-leaders";
import {
  deleteAwardEntry,
  deleteAwardPhoto,
  uploadAwardPhoto,
} from "@/lib/awards/photos-service";
import type { AwardFormState } from "./form-state";

function revalidateEvening(eveningId: string) {
  revalidatePath("/awards");
  revalidatePath(`/awards/${eveningId}`, "layout");
}

export async function createAwardEveningAction(
  _prevState: AwardFormState,
  formData: FormData,
): Promise<AwardFormState> {
  const seasonId = formData.get("seasonId");
  if (typeof seasonId !== "string" || !(await getSeason(seasonId))) {
    return { errors: { seasonId: ["Choose a season"] } };
  }

  let eveningId: string;
  try {
    eveningId = (await createAwardEvening(seasonId))._id;
  } catch (error) {
    if (error instanceof DuplicateAwardEveningError) {
      return {
        errors: { seasonId: ["That season already has an awards evening"] },
      };
    }
    throw error;
  }

  revalidatePath("/awards");
  redirect(`/awards/${eveningId}`);
}

// Bound directly to <form action={...}>; the radios only offer valid values.
export async function setAwardEveningStatusAction(
  eveningId: string,
  formData: FormData,
): Promise<void> {
  const status = AwardEveningStatusSchema.parse(formData.get("status"));
  await setAwardEveningStatus(eveningId, status);
  revalidateEvening(eveningId);
}

export async function addStandardAwardsAction(
  eveningId: string,
): Promise<void> {
  await addAwardEntries(eveningId, standardAwardEntries());
  revalidateEvening(eveningId);
}

async function knownPlayerIds(): Promise<Set<string>> {
  return new Set((await listPlayers()).map((player) => player._id));
}

export async function createAwardEntryAction(
  eveningId: string,
  _prevState: AwardFormState,
  formData: FormData,
): Promise<AwardFormState> {
  const parsed = parseAwardEntryForm(formData, await knownPlayerIds());
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  await addAwardEntry(eveningId, parsed.input);
  revalidateEvening(eveningId);
  redirect(`/awards/${eveningId}`);
}

export async function updateAwardEntryAction(
  eveningId: string,
  entryId: string,
  _prevState: AwardFormState,
  formData: FormData,
): Promise<AwardFormState> {
  const parsed = parseAwardEntryForm(formData, await knownPlayerIds());
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  await updateAwardEntry(eveningId, entryId, parsed.input);
  revalidateEvening(eveningId);
  redirect(`/awards/${eveningId}`);
}

// Sets a stat award's winners to the current leader(s), worked out again
// here rather than trusting the page, keeping the award's other details.
export async function applyStatSuggestionAction(
  eveningId: string,
  entryId: string,
): Promise<void> {
  const evening = await getAwardEvening(eveningId);
  const entry = evening?.entries.find((candidate) => candidate._id === entryId);
  const stat = entry && awardStat(entry);
  if (!evening || !entry || !stat) {
    return;
  }
  const [games, players] = await Promise.all([listGames(), listPlayers()]);
  const leader = statAwardLeader(
    games,
    players,
    evening.seasonId,
    entry.competition,
    stat,
  );
  if (!leader) {
    return;
  }

  // updateAwardEntry keeps the photo.
  await updateAwardEntry(eveningId, entry._id, {
    category: entry.category,
    customName: entry.customName,
    competition: entry.competition,
    note: entry.note,
    hideTotal: entry.hideTotal,
    winners: leader.playerIds,
  });
  revalidateEvening(eveningId);
  redirect(`/awards/${eveningId}`);
}

export async function moveAwardEntryAction(
  eveningId: string,
  entryId: string,
  direction: "earlier" | "later",
): Promise<void> {
  await moveAwardEntry(eveningId, entryId, direction);
  revalidateEvening(eveningId);
}

export async function deleteAwardEntryAction(
  eveningId: string,
  entryId: string,
): Promise<void> {
  await deleteAwardEntry(eveningId, entryId);
  revalidateEvening(eveningId);
}

export type AwardPhotoActionResult =
  { ok: true } | { ok: false; error: string };

// Returns rather than redirects, so the uploader can show the outcome in
// place, as the game photo uploader does.
export async function uploadAwardPhotoAction(
  eveningId: string,
  entryId: string,
  formData: FormData,
): Promise<AwardPhotoActionResult> {
  const file = formData.get("photo");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "Choose a photo to upload" };
  }

  const result = await uploadAwardPhoto(eveningId, entryId, file);
  if (!result.ok) {
    return result;
  }
  revalidateEvening(eveningId);
  return { ok: true };
}

export async function deleteAwardPhotoAction(
  eveningId: string,
  entryId: string,
): Promise<void> {
  await deleteAwardPhoto(eveningId, entryId);
  revalidateEvening(eveningId);
}
