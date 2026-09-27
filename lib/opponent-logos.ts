import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Client } from "./s3";
import {
  LOGO_EXTENSIONS,
  logoExtensionFor,
  type LogoContentType,
  type OpponentLogo,
} from "./schemas";

export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function bucket(): string {
  const name = process.env.S3_BUCKET;
  if (!name) {
    throw new Error("S3_BUCKET is not set");
  }
  return name;
}

export type LogoValidationResult =
  | { ok: true; contentType: LogoContentType }
  | { ok: false; error: string };

// Checks an uploaded file before anything is written anywhere. The content
// type comes from the browser-reported MIME type, checked against the
// allowlist — the filename's extension is never trusted or used.
export function validateLogoFile(file: {
  type: string;
  size: number;
}): LogoValidationResult {
  if (!(file.type in LOGO_EXTENSIONS)) {
    return { ok: false, error: "Logo must be an SVG, PNG, JPEG, or WebP image" };
  }
  if (file.size === 0) {
    return { ok: false, error: "Logo file is empty" };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Logo must be 5 MB or smaller" };
  }
  return { ok: true, contentType: file.type as LogoContentType };
}

// A fresh key per upload (design D2): replacing a logo never overwrites an
// object the CDN may have cached, so no invalidation is ever needed.
export function buildLogoKey(
  opponentId: string,
  contentType: LogoContentType,
  now: Date = new Date(),
): string {
  return `opponents/${opponentId}/logo-${now.getTime()}.${logoExtensionFor(contentType)}`;
}

export async function uploadLogo(
  opponentId: string,
  contentType: LogoContentType,
  body: Uint8Array,
): Promise<OpponentLogo> {
  const key = buildLogoKey(opponentId, contentType);
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { key, contentType };
}

export async function deleteLogo(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
  );
}

// Best-effort cleanup for compensating deletes: an orphaned object is
// harmless (design Risks), so a failed cleanup must never mask the error
// or success that the caller is actually reporting.
export async function deleteLogoQuietly(key: string): Promise<void> {
  try {
    await deleteLogo(key);
  } catch (error) {
    console.error(`Failed to delete opponent logo "${key}":`, error);
  }
}

export async function readLogo(key: string): Promise<Uint8Array> {
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  if (!response.Body) {
    throw new Error(`Opponent logo "${key}" has no body`);
  }
  return response.Body.transformToByteArray();
}
