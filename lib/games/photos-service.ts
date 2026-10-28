import {
  addGamePhoto,
  getGame,
  NotFoundError,
  PhotoLimitReachedError,
  removeGamePhoto,
} from "../repositories";
import type { Game } from "../schemas";
import {
  buildPhotoKey,
  deletePhotoQuietly,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_GAME,
  processPhoto,
  uploadPhoto,
} from "../game-photos";

export type PhotoUploadResult =
  | { ok: true; game: Game }
  | { ok: false; error: string };

// add-game-photos design D4: validate → process → put → atomic push. Nothing
// is written until the photo has been decoded and processed, and the
// document never points at an object that isn't there. If the push is
// refused (game full or gone), the just-uploaded object is cleaned up.
export async function uploadGamePhoto(
  gameId: string,
  file: Blob,
): Promise<PhotoUploadResult> {
  // Checked before reading the bytes, so an oversized file isn't buffered.
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo must be 25 MB or smaller" };
  }

  // Saves processing a 20 MB photo only for the push to refuse it. The
  // atomic push below is still what actually enforces the limit.
  const game = await getGame(gameId);
  if (!game) {
    return { ok: false, error: "Game not found" };
  }
  if ((game.photos?.length ?? 0) >= MAX_PHOTOS_PER_GAME) {
    return { ok: false, error: `A game can have at most ${MAX_PHOTOS_PER_GAME} photos` };
  }

  const processed = await processPhoto(new Uint8Array(await file.arrayBuffer()));
  if (!processed.ok) {
    return processed;
  }

  const key = buildPhotoKey(gameId);
  await uploadPhoto(key, processed.body);
  try {
    return { ok: true, game: await addGamePhoto(gameId, key) };
  } catch (error) {
    await deletePhotoQuietly(key);
    if (error instanceof PhotoLimitReachedError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof NotFoundError) {
      return { ok: false, error: "Game not found" };
    }
    throw error;
  }
}

// The document goes first, then the object (best-effort), so a failed S3
// delete can only ever leave a harmless orphan.
export async function deleteGamePhoto(gameId: string, key: string): Promise<Game> {
  const game = await removeGamePhoto(gameId, key);
  await deletePhotoQuietly(key);
  return game;
}
