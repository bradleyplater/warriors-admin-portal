import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { getS3Client } from "../../lib/s3";
import {
  createOpponent,
  deleteOpponent,
  ensureIndexes,
  getOpponent,
} from "../../lib/repositories";
import {
  createOpponentWithLogo,
  deleteOpponentIfUnreferenced,
  logoFromFormData,
  updateOpponentWithLogo,
} from "../../lib/opponents/service";

// Runs against the local Docker Mongo + S3 emulator, like publish-run.test.ts.
const NAME_PREFIX = "Zztest Service";

function file(type: string, content = "<svg xmlns='http://www.w3.org/2000/svg'/>") {
  return new File([content], "logo", { type });
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

async function contentTypeOf(key: string): Promise<string | undefined> {
  const response = await getS3Client().send(
    new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
  );
  return response.ContentType;
}

describe("opponent service", () => {
  const createdIds: string[] = [];

  beforeAll(async () => {
    const db = await getDb();
    await ensureIndexes(db);
    await db
      .collection("Opponent")
      .deleteMany({ name: { $regex: `^${NAME_PREFIX}`, $options: "i" } });
  });

  afterEach(async () => {
    const db = await getDb();
    await db.collection<{ _id: string }>("Game").deleteMany({ _id: { $regex: /^GME9998/ } });
    await db
      .collection<{ _id: string }>("UpcomingGame")
      .deleteMany({ _id: { $regex: /^UPG9998/ } });
    while (createdIds.length > 0) {
      const id = createdIds.pop();
      if (id) await deleteOpponent(id).catch(() => undefined);
    }
  });

  async function created(result: Awaited<ReturnType<typeof createOpponentWithLogo>>) {
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    createdIds.push(result.opponent._id);
    return result.opponent;
  }

  it("creates an opponent without a logo", async () => {
    const opponent = await created(
      await createOpponentWithLogo(`${NAME_PREFIX} Plain`, undefined),
    );
    expect(opponent.logo).toBeUndefined();
  });

  it("creates an opponent with a logo stored under its folder with the right content type", async () => {
    const opponent = await created(
      await createOpponentWithLogo(`${NAME_PREFIX} Logo`, file("image/svg+xml")),
    );
    expect(opponent.logo?.key).toMatch(
      new RegExp(`^opponents/${opponent._id}/logo-\\d+\\.svg$`),
    );
    expect(opponent.logo?.contentType).toBe("image/svg+xml");
    expect(await contentTypeOf(opponent.logo!.key)).toBe("image/svg+xml");
  });

  it("rejects an invalid name and file without writing anything", async () => {
    const result = await createOpponentWithLogo("  ", file("image/gif"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.logo).toEqual([
        "Logo must be an SVG, PNG, JPEG, or WebP image",
      ]);
    }
  });

  it("reports a duplicate name as a field error without uploading", async () => {
    await created(await createOpponentWithLogo(`${NAME_PREFIX} Dupe`, undefined));
    const result = await createOpponentWithLogo(
      `${NAME_PREFIX} DUPE`,
      file("image/svg+xml"),
    );
    expect(result).toMatchObject({ ok: false, errors: { name: [expect.any(String)] } });
  });

  it("replaces a logo under a new key and deletes the old object", async () => {
    const opponent = await created(
      await createOpponentWithLogo(`${NAME_PREFIX} Replace`, file("image/png", "png")),
    );
    const oldKey = opponent.logo!.key;

    const result = await updateOpponentWithLogo(
      opponent._id,
      `${NAME_PREFIX} Replace`,
      file("image/svg+xml"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.opponent.logo?.key).not.toBe(oldKey);
    expect(result.opponent.logo?.key).toMatch(/\.svg$/);
    expect(await objectExists(result.opponent.logo!.key)).toBe(true);
    expect(await objectExists(oldKey)).toBe(false);
  });

  it("renames without touching the logo", async () => {
    const opponent = await created(
      await createOpponentWithLogo(`${NAME_PREFIX} Before`, file("image/svg+xml")),
    );
    const result = await updateOpponentWithLogo(
      opponent._id,
      `${NAME_PREFIX} After`,
      undefined,
    );
    expect(result.ok && result.opponent.name).toBe(`${NAME_PREFIX} After`);
    expect(result.ok && result.opponent.logo).toEqual(opponent.logo);
    expect(await objectExists(opponent.logo!.key)).toBe(true);
  });

  it("cleans up the uploaded replacement when the rename collides", async () => {
    await created(await createOpponentWithLogo(`${NAME_PREFIX} Taken`, undefined));
    const opponent = await created(
      await createOpponentWithLogo(`${NAME_PREFIX} Mine`, file("image/png", "png")),
    );

    const result = await updateOpponentWithLogo(
      opponent._id,
      `${NAME_PREFIX} Taken`,
      file("image/svg+xml"),
    );
    expect(result.ok).toBe(false);

    const after = await getOpponent(opponent._id);
    expect(after?.logo).toEqual(opponent.logo);
    expect(await objectExists(opponent.logo!.key)).toBe(true);
  });

  it("blocks deleting a referenced opponent, keeping its document and logo", async () => {
    const opponent = await created(
      await createOpponentWithLogo(`${NAME_PREFIX} Referenced`, file("image/svg+xml")),
    );
    const db = await getDb();
    await db.collection<{ _id: string }>("Game").insertMany(
      ["GME999801", "GME999802", "GME999803"].map((_id) => ({
        _id,
        opponentTeam: { opponentId: opponent._id, goals: [], penalties: [] },
      })),
    );

    expect(await deleteOpponentIfUnreferenced(opponent._id)).toEqual({
      ok: false,
      referencingGameCount: 3,
      referencingUpcomingGameCount: 0,
    });
    expect(await getOpponent(opponent._id)).not.toBeNull();
    expect(await objectExists(opponent.logo!.key)).toBe(true);
  });

  it("blocks deleting an opponent only an upcoming game references", async () => {
    const opponent = await created(
      await createOpponentWithLogo(`${NAME_PREFIX} Scheduled`, file("image/svg+xml")),
    );
    const db = await getDb();
    await db.collection<{ _id: string; opponentId: string }>("UpcomingGame").insertOne({
      _id: "UPG999801",
      opponentId: opponent._id,
    });

    expect(await deleteOpponentIfUnreferenced(opponent._id)).toEqual({
      ok: false,
      referencingGameCount: 0,
      referencingUpcomingGameCount: 1,
    });
    expect(await getOpponent(opponent._id)).not.toBeNull();
    expect(await objectExists(opponent.logo!.key)).toBe(true);
  });

  it("deletes an unreferenced opponent and its logo", async () => {
    const opponent = await created(
      await createOpponentWithLogo(`${NAME_PREFIX} Unreferenced`, file("image/svg+xml")),
    );
    expect(await deleteOpponentIfUnreferenced(opponent._id)).toEqual({ ok: true });
    expect(await getOpponent(opponent._id)).toBeNull();
    expect(await objectExists(opponent.logo!.key)).toBe(false);
  });

  it("deletes an unreferenced opponent that has no logo", async () => {
    const opponent = await createOpponent({ name: `${NAME_PREFIX} Bare` });
    createdIds.push(opponent._id);
    expect(await deleteOpponentIfUnreferenced(opponent._id)).toEqual({ ok: true });
  });
});

describe("logoFromFormData", () => {
  it("treats an empty file input as no logo", () => {
    expect(logoFromFormData(new File([], ""))).toBeUndefined();
    expect(
      logoFromFormData(new File([], "undefined", { type: "application/octet-stream" })),
    ).toBeUndefined();
    expect(logoFromFormData(null)).toBeUndefined();
    expect(logoFromFormData("text")).toBeUndefined();
  });

  it("returns a chosen file", () => {
    const chosen = file("image/png", "png");
    expect(logoFromFormData(chosen)).toBe(chosen);
  });
});
