import {
  countGamesByOpponentId,
  countUpcomingGamesByOpponentId,
  createOpponent,
  deleteOpponent,
  DuplicateOpponentNameError,
  getOpponent,
  NotFoundError,
  updateOpponent,
} from "../repositories";
import { OpponentCreateInputSchema, type Opponent } from "../schemas";
import {
  deleteLogoQuietly,
  uploadLogo,
  validateLogoFile,
} from "../opponent-logos";
import type { LogoContentType } from "../schemas";

export type OpponentFieldErrors = Record<string, string[] | undefined>;

export type OpponentResult =
  | { ok: true; opponent: Opponent }
  | { ok: false; errors: OpponentFieldErrors };

// A file chosen in a form, or undefined when the file input was left empty.
// An empty input still submits a zero-byte File (whose name and type vary
// between browsers and Next's action decoding), so any zero-byte file
// counts as "no logo" — there's nothing to upload either way.
export type LogoUpload = Blob;

export function logoFromFormData(value: FormDataEntryValue | null): LogoUpload | undefined {
  if (!(value instanceof Blob) || value.size === 0) return undefined;
  return value;
}

function validateInput(
  name: unknown,
  logo: LogoUpload | undefined,
):
  | { ok: true; name: string; contentType?: LogoContentType }
  | { ok: false; errors: OpponentFieldErrors } {
  const errors: OpponentFieldErrors = {};
  const parsed = OpponentCreateInputSchema.pick({ name: true }).safeParse({ name });
  if (!parsed.success) {
    errors.name = parsed.error.flatten().fieldErrors.name;
  }

  let contentType: LogoContentType | undefined;
  if (logo) {
    const result = validateLogoFile(logo);
    if (result.ok) {
      contentType = result.contentType;
    } else {
      errors.logo = [result.error];
    }
  }

  if (!parsed.success || errors.logo) {
    return { ok: false, errors };
  }
  return { ok: true, name: parsed.data.name, contentType };
}

async function readBytes(logo: LogoUpload): Promise<Uint8Array> {
  return new Uint8Array(await logo.arrayBuffer());
}

function duplicateNameErrors(error: DuplicateOpponentNameError): OpponentFieldErrors {
  return { name: [error.message] };
}

// Everything is validated before anything is written, and the document is
// inserted before the logo is uploaded — so a duplicate name never leaves
// an object in S3. If the upload (or recording it) then fails, the new
// document is removed so the admin can simply retry.
export async function createOpponentWithLogo(
  name: unknown,
  logo: LogoUpload | undefined,
): Promise<OpponentResult> {
  const input = validateInput(name, logo);
  if (!input.ok) return input;

  let opponent: Opponent;
  try {
    opponent = await createOpponent({ name: input.name });
  } catch (error) {
    if (error instanceof DuplicateOpponentNameError) {
      return { ok: false, errors: duplicateNameErrors(error) };
    }
    throw error;
  }

  if (!logo || !input.contentType) {
    return { ok: true, opponent };
  }

  let uploadedKey: string | undefined;
  try {
    const uploaded = await uploadLogo(opponent._id, input.contentType, await readBytes(logo));
    uploadedKey = uploaded.key;
    opponent = await updateOpponent(opponent._id, { logo: uploaded });
  } catch (error) {
    if (uploadedKey) await deleteLogoQuietly(uploadedKey);
    await deleteOpponent(opponent._id).catch(() => undefined);
    throw error;
  }
  return { ok: true, opponent };
}

// A replacement logo goes to a fresh key (design D2). The old object is only
// deleted once the document points at the new one, so a failure part-way
// can orphan an object but never leave the document pointing at nothing.
export async function updateOpponentWithLogo(
  id: string,
  name: unknown,
  logo: LogoUpload | undefined,
): Promise<OpponentResult> {
  const input = validateInput(name, logo);
  if (!input.ok) return input;

  const existing = await getOpponent(id);
  if (!existing) {
    throw new NotFoundError("opponent", id);
  }

  if (!logo || !input.contentType) {
    try {
      return { ok: true, opponent: await updateOpponent(id, { name: input.name }) };
    } catch (error) {
      if (error instanceof DuplicateOpponentNameError) {
        return { ok: false, errors: duplicateNameErrors(error) };
      }
      throw error;
    }
  }

  const uploaded = await uploadLogo(id, input.contentType, await readBytes(logo));
  let opponent: Opponent;
  try {
    opponent = await updateOpponent(id, { name: input.name, logo: uploaded });
  } catch (error) {
    await deleteLogoQuietly(uploaded.key);
    if (error instanceof DuplicateOpponentNameError) {
      return { ok: false, errors: duplicateNameErrors(error) };
    }
    throw error;
  }

  if (existing.logo && existing.logo.key !== uploaded.key) {
    await deleteLogoQuietly(existing.logo.key);
  }
  return { ok: true, opponent };
}

export type DeleteOpponentResult =
  | { ok: true }
  | {
      ok: false;
      referencingGameCount: number;
      referencingUpcomingGameCount: number;
    };

export async function deleteOpponentIfUnreferenced(
  id: string,
): Promise<DeleteOpponentResult> {
  const existing = await getOpponent(id);
  if (!existing) {
    throw new NotFoundError("opponent", id);
  }

  // Upcoming games count too: deleting their opponent would make the next
  // publish fail on the dangling reference.
  const [referencingGameCount, referencingUpcomingGameCount] = await Promise.all([
    countGamesByOpponentId(id),
    countUpcomingGamesByOpponentId(id),
  ]);
  if (referencingGameCount > 0 || referencingUpcomingGameCount > 0) {
    return { ok: false, referencingGameCount, referencingUpcomingGameCount };
  }

  await deleteOpponent(id);
  if (existing.logo) {
    await deleteLogoQuietly(existing.logo.key);
  }
  return { ok: true };
}
