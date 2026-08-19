import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../s3";
import { getDb } from "../mongodb";
import { serializeDocuments } from "./ejson";

export interface BackupCollectionSummary {
  name: string;
  documentCount: number;
}

export interface BackupSummary {
  prefix: string;
  startedAt: Date;
  collections: BackupCollectionSummary[];
}

function timestampPrefix(date: Date): string {
  return `backups/${date.toISOString().replace(/[:.]/g, "-")}`;
}

async function uploadBackupFile(bucket: string, key: string, body: string): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json; charset=utf-8",
    }),
  );
}

// Full-database backup (Migration Plan Step 0): every collection in the
// source DB — including legacy ones no repository knows about, e.g.
// ApiKeys — is EJSON-dumped and uploaded to S3 under a single timestamped
// prefix, one object per collection plus a manifest. Driver-based rather
// than shelling out to mongodump, which isn't installed in this environment
// or CI (docs/04-migration-plan.md).
export async function runBackup(): Promise<BackupSummary> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }

  const startedAt = new Date();
  const prefix = timestampPrefix(startedAt);
  const db = await getDb();
  const collectionInfos = await db.listCollections({}, { nameOnly: true }).toArray();

  const collections: BackupCollectionSummary[] = [];
  for (const { name } of collectionInfos) {
    if (name.startsWith("system.")) {
      continue;
    }
    const documents = await db.collection(name).find({}).toArray();
    await uploadBackupFile(bucket, `${prefix}/${name}.json`, serializeDocuments(documents));
    collections.push({ name, documentCount: documents.length });
  }

  await uploadBackupFile(
    bucket,
    `${prefix}/manifest.json`,
    JSON.stringify({ prefix, startedAt: startedAt.toISOString(), collections }, null, 2),
  );

  return { prefix, startedAt, collections };
}
