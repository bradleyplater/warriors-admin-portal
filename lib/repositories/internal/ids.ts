import { MongoServerError } from "mongodb";

const DUPLICATE_KEY_ERROR_CODE = 11000;
const DEFAULT_MAX_ATTEMPTS = 10;

function randomId(prefix: string): string {
  const digits = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `${prefix}${digits}`;
}

// True when `error` is a MongoDB duplicate-key error raised specifically by
// the named index/field (e.g. "_id" or "number") rather than some other
// unique constraint — needed because a random id collision and a genuine
// business-rule violation (e.g. duplicate shirt number) both surface as the
// same error code and must be handled differently by callers.
export function isDuplicateKeyErrorForField(
  error: unknown,
  field: string,
): boolean {
  if (!(error instanceof MongoServerError)) {
    return false;
  }
  if (error.code !== DUPLICATE_KEY_ERROR_CODE) {
    return false;
  }
  const keyPattern = error.keyPattern as Record<string, unknown> | undefined;
  if (keyPattern) {
    return field in keyPattern;
  }
  return typeof error.message === "string" && error.message.includes(field);
}

// Generates a PREFIX + 6-digit candidate id and hands it to `attemptInsert`.
// If the insert fails with a duplicate-key error on `_id`, a new candidate
// is generated and the insert retried, up to `maxAttempts`. Any other error
// (including a duplicate-key error on a different field) is rethrown as-is.
export async function generateTopLevelId<T>(
  prefix: string,
  attemptInsert: (id: string) => Promise<T>,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = randomId(prefix);
    try {
      return await attemptInsert(id);
    } catch (error) {
      if (isDuplicateKeyErrorForField(error, "_id")) {
        continue;
      }
      throw error;
    }
  }
  throw new Error(
    `Failed to generate a unique id with prefix "${prefix}" after ${maxAttempts} attempts`,
  );
}

// Generates a PREFIX + 6-digit candidate id that does not collide with any
// of `existingIds`. Purely in-memory — used for embedded goal/penalty ids,
// which only need to be unique within the single Game document they belong
// to (see design.md), not across the whole `games` collection.
export function generateEmbeddedId(
  prefix: string,
  existingIds: Iterable<string>,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): string {
  const existing = new Set(existingIds);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = randomId(prefix);
    if (!existing.has(id)) {
      return id;
    }
  }
  throw new Error(
    `Failed to generate a unique id with prefix "${prefix}" after ${maxAttempts} attempts`,
  );
}
