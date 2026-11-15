// Preview and save for importing a game from a game-sheet CSV
// (import-game-csv). Kept out of the server actions so it can be
// integration-tested: actions that call redirect/revalidatePath can't be.
import { z } from "zod";
import {
  createGame,
  getOpponent,
  getTheTeam,
  listGames,
  listOpponents,
  listPlayers,
  listSeasons,
} from "../repositories";
import { GoalTypeSchema, PenaltyCodeSchema } from "../schemas";
import { parseCsv } from "../game-import/csv";
import { NotAGameSheetError, parseGameSheet } from "../game-import/parse-sheet";
import { resolveImport } from "../game-import/resolve";
import {
  IMPORTABLE_GAME_TYPES,
  type ImportPreview,
  type ImportResolutions,
  type PortalContext,
} from "../game-import/types";

// A game sheet is a few KB; anything far bigger isn't one.
export const MAX_IMPORT_CSV_CHARS = 200_000;

const ResolutionsSchema = z.object({
  warriorsSide: z.enum(["HOME", "AWAY"]).optional(),
  opponentId: z.string().optional(),
  seasonId: z.string().optional(),
  gameType: z.enum(IMPORTABLE_GAME_TYPES).optional(),
  date: z.string().optional(),
  players: z.record(z.string(), z.string()).optional(),
  goalTypes: z.record(z.string(), GoalTypeSchema).optional(),
  penaltyCodes: z.record(z.string(), PenaltyCodeSchema).optional(),
});

export type ImportPreviewResult =
  { ok: true; preview: ImportPreview } | { ok: false; error: string };

export type ImportSaveResult =
  | { ok: true; gameId: string }
  | { ok: false; error: string; preview?: ImportPreview };

async function loadContext(): Promise<PortalContext | null> {
  const [team, players, opponents, seasons, games] = await Promise.all([
    getTheTeam(),
    listPlayers(),
    listOpponents(),
    listSeasons(),
    listGames(),
  ]);
  if (!team) return null;
  return { team, players, opponents, seasons, games };
}

// Never writes: parses, matches against current portal data, and returns
// what would be saved.
export async function previewGameImport(
  csvText: unknown,
  resolutions: unknown,
): Promise<ImportPreviewResult> {
  if (typeof csvText !== "string" || csvText.trim() === "") {
    return { ok: false, error: "Choose a CSV file to import." };
  }
  if (csvText.length > MAX_IMPORT_CSV_CHARS) {
    return { ok: false, error: "This file is too large to be a game sheet." };
  }
  const parsedResolutions = ResolutionsSchema.safeParse(resolutions ?? {});
  if (!parsedResolutions.success) {
    return {
      ok: false,
      error: "The import choices were invalid — reload and try again.",
    };
  }

  let sheet;
  try {
    sheet = parseGameSheet(parseCsv(csvText));
  } catch (error) {
    if (error instanceof NotAGameSheetError) {
      return {
        ok: false,
        error:
          "This file isn't a recognised game sheet — export a game tab from the season workbook as CSV.",
      };
    }
    throw error;
  }

  const context = await loadContext();
  if (!context) {
    return {
      ok: false,
      error: "No team is configured — cannot import a game.",
    };
  }
  return {
    ok: true,
    preview: resolveImport(
      sheet,
      context,
      parsedResolutions.data as ImportResolutions,
    ),
  };
}

// Re-derives everything from the CSV and the admin's choices — the client
// never sends a built game — and creates it only when nothing is flagged.
export async function saveGameImport(
  csvText: unknown,
  resolutions: unknown,
): Promise<ImportSaveResult> {
  const result = await previewGameImport(csvText, resolutions);
  if (!result.ok) return result;
  const { preview } = result;
  if (!preview.input) {
    return {
      ok: false,
      error: "Fix every flagged item before saving.",
      preview,
    };
  }

  // The opponent existed when the context loaded, but re-check right
  // before writing, as createGameAction does.
  if (!(await getOpponent(preview.input.opponentTeam.opponentId))) {
    return {
      ok: false,
      error: "The opponent no longer exists — choose another.",
      preview,
    };
  }

  const game = await createGame(preview.input);
  return { ok: true, gameId: game._id };
}
