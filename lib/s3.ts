import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | undefined;

function maskAccessKeyId(id: string): string {
  return id.length <= 8 ? "***" : `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function getS3Client(): S3Client {
  if (!client) {
    const region = process.env.AWS_REGION ?? "us-east-1";
    // "" as well as unset must both mean "no custom endpoint" — an env file
    // that explicitly blanks this key to override a lower-priority file's
    // value (see infra/terraform/README.md) still needs it treated as unset.
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    console.log(
      "Constructing S3 client:",
      JSON.stringify({
        region,
        endpoint: endpoint || "(default AWS endpoint)",
        forcePathStyle: !!endpoint,
        accessKeyId: accessKeyId ? maskAccessKeyId(accessKeyId) : "(none — falling back to default credential provider chain)",
        secretAccessKeyLength: secretAccessKey?.length ?? 0,
      }),
    );

    client = new S3Client({
      region,
      endpoint,
      forcePathStyle: !!endpoint,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }
  return client;
}
