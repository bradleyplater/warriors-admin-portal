import { randomBytes } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { getS3Client } from "./s3";

export { MAX_PHOTOS_PER_GAME } from "./schemas";

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

// The website's carousel slot is at most 1120×630 CSS px; this box covers it
// at 2× DPR with a little headroom. Fitting inside a 16:9 box (rather than
// capping the long edge) gives portrait photos exactly the slot's height
// (add-game-photos design D2). Tune these after seeing real photos.
export const PHOTO_MAX_WIDTH = 2400;
export const PHOTO_MAX_HEIGHT = 1350;
export const PHOTO_WEBP_QUALITY = 90;
const PHOTO_WEBP_EFFORT = 6;

// Guards against decompression bombs; ~50 MP is beyond any phone camera's
// default output.
export const PHOTO_MAX_INPUT_PIXELS = 50_000_000;

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export const PHOTO_FORMAT_ERROR = "Photo must be a JPEG, PNG or WebP image";

function bucket(): string {
  const name = process.env.S3_BUCKET;
  if (!name) {
    throw new Error("S3_BUCKET is not set");
  }
  return name;
}

export type ProcessPhotoResult =
  | { ok: true; body: Buffer; width: number; height: number }
  | { ok: false; error: string };

// Turns an upload into what's actually stored: upright, sRGB, scaled down to
// fit the box (never cropped or enlarged), high-quality WebP, with every bit
// of metadata — GPS included — dropped by simply not calling withMetadata().
// The format comes from decoding the bytes, never from the filename or the
// browser-reported type.
export async function processPhoto(input: Uint8Array): Promise<ProcessPhotoResult> {
  if (input.byteLength === 0) {
    return { ok: false, error: "Photo file is empty" };
  }
  if (input.byteLength > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo must be 25 MB or smaller" };
  }

  const options = { limitInputPixels: PHOTO_MAX_INPUT_PIXELS };
  let format: string | undefined;
  try {
    ({ format } = await sharp(input, options).metadata());
  } catch {
    return { ok: false, error: PHOTO_FORMAT_ERROR };
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    return { ok: false, error: PHOTO_FORMAT_ERROR };
  }

  try {
    const { data, info } = await sharp(input, options)
      .rotate()
      .resize(PHOTO_MAX_WIDTH, PHOTO_MAX_HEIGHT, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColourspace("srgb")
      .webp({
        quality: PHOTO_WEBP_QUALITY,
        effort: PHOTO_WEBP_EFFORT,
        smartSubsample: true,
      })
      .toBuffer({ resolveWithObject: true });
    return { ok: true, body: data, width: info.width, height: info.height };
  } catch (error) {
    // Header looked fine but the pixel data didn't decode (truncated file,
    // or over the pixel limit).
    const message = error instanceof Error ? error.message : String(error);
    if (/pixel limit/i.test(message)) {
      return { ok: false, error: "Photo is too large (over 50 megapixels)" };
    }
    return { ok: false, error: "Photo could not be read — is the file damaged?" };
  }
}

// A fresh key per upload, like opponent logos (design D4): objects are never
// overwritten, so the CDN never needs invalidating. The random suffix stops
// two photos processed in the same millisecond from colliding.
export function buildPhotoKey(gameId: string, now: Date = new Date()): string {
  return `games/${gameId}/photos/${now.getTime()}-${randomBytes(3).toString("hex")}.webp`;
}

export async function uploadPhoto(key: string, body: Uint8Array): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: "image/webp",
    }),
  );
}

// Best-effort, as for opponent logos: an orphaned object is harmless, so a
// failed cleanup must never mask what the caller is actually reporting.
export async function deletePhotoQuietly(key: string): Promise<void> {
  try {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
    );
  } catch (error) {
    console.error(`Failed to delete game photo "${key}":`, error);
  }
}

export async function readPhoto(key: string): Promise<Uint8Array> {
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  if (!response.Body) {
    throw new Error(`Game photo "${key}" has no body`);
  }
  return response.Body.transformToByteArray();
}
