import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  buildPhotoKey,
  MAX_PHOTO_BYTES,
  PHOTO_FORMAT_ERROR,
  processPhoto,
} from "./game-photos";

// Images are generated rather than committed, so there are no binary fixtures.
function image(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 90, b: 160 } },
  });
}

async function processOk(input: Uint8Array) {
  const result = await processPhoto(input);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result;
}

describe("processPhoto", () => {
  it("downscales a large landscape photo to fit 2400×1350", async () => {
    const result = await processOk(await image(6000, 4000).jpeg().toBuffer());
    expect([result.width, result.height]).toEqual([2025, 1350]);
  });

  it("keeps a portrait photo's shape without cropping", async () => {
    const result = await processOk(await image(3000, 4000).jpeg().toBuffer());
    expect(result.height).toBe(1350);
    expect(result.width).toBeCloseTo(1013, -1);
  });

  it("does not enlarge a small photo", async () => {
    const result = await processOk(await image(1200, 800).png().toBuffer());
    expect([result.width, result.height]).toEqual([1200, 800]);
  });

  it("outputs WebP whatever the input", async () => {
    const result = await processOk(await image(400, 300).png().toBuffer());
    expect((await sharp(result.body).metadata()).format).toBe("webp");
  });

  it("applies EXIF orientation so phone photos come out upright", async () => {
    const rotated = await image(4000, 3000)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const result = await processOk(rotated);
    expect(result.height).toBe(1350);
    expect(result.width).toBeLessThan(result.height);
  });

  it("strips all metadata, including GPS", async () => {
    const withGps = await image(800, 600)
      .jpeg()
      .withExif({
        IFD0: { Make: "Phone" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "52/1 34/1 0/1" },
      })
      .toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeDefined();

    const result = await processOk(withGps);
    const metadata = await sharp(result.body).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it("rejects a GIF", async () => {
    const gif = await image(100, 100).gif().toBuffer();
    expect(await processPhoto(gif)).toEqual({ ok: false, error: PHOTO_FORMAT_ERROR });
  });

  it("rejects bytes that aren't an image", async () => {
    const garbage = new TextEncoder().encode("definitely not a jpeg");
    expect(await processPhoto(garbage)).toEqual({ ok: false, error: PHOTO_FORMAT_ERROR });
  });

  it("rejects a truncated JPEG", async () => {
    const jpeg = await image(1000, 800).jpeg().toBuffer();
    const result = await processPhoto(jpeg.subarray(0, jpeg.length / 3));
    expect(result.ok).toBe(false);
  });

  it("rejects a file over 25 MB before decoding it", async () => {
    expect(await processPhoto(new Uint8Array(MAX_PHOTO_BYTES + 1))).toEqual({
      ok: false,
      error: "Photo must be 25 MB or smaller",
    });
  });

  it("rejects an empty file", async () => {
    expect((await processPhoto(new Uint8Array(0))).ok).toBe(false);
  });
});

describe("buildPhotoKey", () => {
  it("builds a fresh WebP key under the game's photo prefix", () => {
    const key = buildPhotoKey("GME000001", new Date(1761500000000));
    expect(key).toMatch(/^games\/GME000001\/photos\/1761500000000-[0-9a-f]{6}\.webp$/);
  });

  it("does not repeat within the same millisecond", () => {
    const now = new Date();
    expect(buildPhotoKey("GME000001", now)).not.toBe(buildPhotoKey("GME000001", now));
  });
});
