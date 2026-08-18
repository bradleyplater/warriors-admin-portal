import { CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { getCloudFrontClient } from "../cloudfront";

// CDN_INVALIDATION holds a CloudFront distribution id and is optional (see
// docs/02-architecture.md#configuration) — publishing must succeed whether
// or not a CDN sits in front of the bucket.
export async function invalidateCdn(
  distributionId: string | undefined,
  changedPaths: string[],
): Promise<void> {
  if (!distributionId || changedPaths.length === 0) {
    return;
  }

  await getCloudFrontClient().send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: {
          Quantity: changedPaths.length,
          Items: changedPaths,
        },
      },
    }),
  );
}
