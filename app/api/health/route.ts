import { NextResponse } from "next/server";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/lib/mongodb";
import { getS3Client } from "@/lib/s3";

type ServiceStatus = "ok" | "error";

async function checkMongo(): Promise<ServiceStatus> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return "ok";
  } catch {
    return "error";
  }
}

async function checkS3(): Promise<ServiceStatus> {
  try {
    await getS3Client().send(
      new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }),
    );
    return "ok";
  } catch {
    return "error";
  }
}

export async function GET() {
  const [mongo, s3] = await Promise.all([checkMongo(), checkS3()]);
  const healthy = mongo === "ok" && s3 === "ok";

  return NextResponse.json({ mongo, s3 }, { status: healthy ? 200 : 503 });
}
