"use server";

import { revalidatePath } from "next/cache";
import { moveGamePhoto, updateGamePhotoText } from "@/lib/repositories";
import { GamePhotoSchema } from "@/lib/schemas";
import { deleteGamePhoto, uploadGamePhoto } from "@/lib/games/photos-service";
import type { PhotoTextFormState } from "./form-state";

export type PhotoUploadActionResult = { ok: true } | { ok: false; error: string };

// One file per call (add-game-photos design D3): the client loops over the
// selection so each photo gets its own status and the body limit stays at
// one photo's worth. Returns rather than redirects, so the loop can carry on.
export async function uploadGamePhotoAction(
  gameId: string,
  formData: FormData,
): Promise<PhotoUploadActionResult> {
  const file = formData.get("photo");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "Choose a photo to upload" };
  }

  const result = await uploadGamePhoto(gameId, file);
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/games/${gameId}`);
  return { ok: true };
}

export async function updateGamePhotoTextAction(
  gameId: string,
  key: string,
  _prevState: PhotoTextFormState,
  formData: FormData,
): Promise<PhotoTextFormState> {
  const text = {
    alt: String(formData.get("alt") ?? "").trim() || undefined,
    caption: String(formData.get("caption") ?? "").trim() || undefined,
  };
  // Same schema the repository re-validates against, run here first so a
  // too-long value comes back as a field error, not an exception.
  const parsed = GamePhotoSchema.pick({ alt: true, caption: true }).safeParse(text);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, saved: false };
  }

  await updateGamePhotoText(gameId, key, parsed.data);
  revalidatePath(`/games/${gameId}`);
  return { errors: {}, saved: true };
}

// Bound directly to <form action={...}>, like the goal/penalty deletes.
export async function moveGamePhotoAction(
  gameId: string,
  key: string,
  direction: "earlier" | "later",
): Promise<void> {
  await moveGamePhoto(gameId, key, direction);
  revalidatePath(`/games/${gameId}`);
}

export async function deleteGamePhotoAction(
  gameId: string,
  key: string,
): Promise<void> {
  await deleteGamePhoto(gameId, key);
  revalidatePath(`/games/${gameId}`);
}
