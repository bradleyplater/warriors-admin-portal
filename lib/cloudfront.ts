import { CloudFrontClient } from "@aws-sdk/client-cloudfront";

let client: CloudFrontClient | undefined;

export function getCloudFrontClient(): CloudFrontClient {
  if (!client) {
    client = new CloudFrontClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return client;
}
