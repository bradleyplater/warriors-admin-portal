"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  previewGameImport,
  saveGameImport,
  type ImportPreviewResult,
  type ImportSaveResult,
} from "@/lib/games/import-service";
import type { ImportResolutions } from "@/lib/game-import/types";

// Writes nothing — see previewGameImport.
export async function previewGameImportAction(
  csvText: string,
  resolutions: ImportResolutions,
): Promise<ImportPreviewResult> {
  return previewGameImport(csvText, resolutions);
}

export async function saveGameImportAction(
  csvText: string,
  resolutions: ImportResolutions,
): Promise<Exclude<ImportSaveResult, { ok: true }>> {
  const result = await saveGameImport(csvText, resolutions);
  if (!result.ok) return result;

  revalidatePath("/games");
  redirect(`/games/${result.gameId}`);
}
