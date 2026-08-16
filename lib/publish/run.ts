import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../s3";
import {
  listPlayers,
  listGames,
  listSeasons,
  createPublish,
  getLatestSuccessfulPublish,
} from "../repositories";
import type { Publishes, PublishesCreateInput } from "../schemas";
import { generateAllArtifacts, serializeArtifact } from "./generate";
import { checksumContent } from "./checksum";
import { invalidateCdn } from "./cdn";

type PublishArtifactResult = PublishesCreateInput["artifacts"][number];

async function uploadArtifact(path: string, body: string): Promise<void> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: body,
      ContentType: "application/json; charset=utf-8",
    }),
  );
}

// Orchestrates the full publish pipeline (docs/02-architecture.md#the-publish-pipeline):
// generate artifacts, checksum + diff against the last successful publish,
// upload changed artifacts to S3, invalidate the CDN for changed paths, and
// record every attempt — success or failure — as a Publishes document.
export async function runPublish(): Promise<Publishes> {
  const startedAt = new Date();
  const results: PublishArtifactResult[] = [];

  try {
    const [players, games, seasons] = await Promise.all([
      listPlayers(),
      listGames(),
      listSeasons(),
    ]);

    const generated = generateAllArtifacts(players, games, seasons);
    const lastPublish = await getLatestSuccessfulPublish();
    const baseline = new Map(
      lastPublish?.artifacts.map((artifact) => [artifact.path, artifact.checksum]) ?? [],
    );

    for (const [path, content] of Object.entries(generated)) {
      const body = serializeArtifact(content);
      const checksum = checksumContent(body);
      const changed = baseline.get(path) !== checksum;

      if (changed) {
        await uploadArtifact(path, body);
      }
      results.push({ path, checksum, changed });
    }

    const changedPaths = results.filter((r) => r.changed).map((r) => `/${r.path}`);
    await invalidateCdn(process.env.CDN_INVALIDATION, changedPaths);

    return await createPublish({
      startedAt,
      completedAt: new Date(),
      artifacts: results,
      status: "success",
    });
  } catch (error) {
    await createPublish({
      startedAt,
      completedAt: new Date(),
      artifacts: results,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
