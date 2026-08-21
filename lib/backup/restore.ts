import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { Db, Document } from "mongodb";
import { getS3Client } from "../s3";
import { deserializeDocuments } from "./ejson";

export interface RestoreCollectionSummary {
  name: string;
  documentCount: number;
}

export interface RestoreSummary {
  prefix: string;
  collections: RestoreCollectionSummary[];
}

async function downloadBackupFile(bucket: string, key: string): Promise<string> {
  const response = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await response.Body?.transformToString();
  if (body === undefined) {
    throw new Error(`Backup object "${key}" has no body`);
  }
  return body;
}

// Reverses runBackup(): every "<prefix>/<collection>.json" object is
// downloaded, EJSON-parsed, and reloaded into targetDb — each target
// collection is cleared and reloaded from the backup, not merged, so the
// target ends up exactly matching the backup's contents.
export async function runRestore(prefix: string, targetDb: Db): Promise<RestoreSummary> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }

  const listKeyPrefix = `${prefix}/`;
  const listed = await getS3Client().send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: listKeyPrefix }),
  );
  const keys = (listed.Contents ?? [])
    .map((object) => object.Key)
    .filter((key): key is string => !!key && key.endsWith(".json") && !key.endsWith("/manifest.json"));

  if (keys.length === 0) {
    throw new Error(`No backup files found under prefix "${prefix}"`);
  }

  const collections: RestoreCollectionSummary[] = [];
  for (const key of keys) {
    const name = key.slice(listKeyPrefix.length, -".json".length);
    const documents = deserializeDocuments(await downloadBackupFile(bucket, key));

    await targetDb.collection(name).deleteMany({});
    if (documents.length > 0) {
      await targetDb.collection<Document>(name).insertMany(documents);
    }
    collections.push({ name, documentCount: documents.length });
  }

  return { prefix, collections };
}
