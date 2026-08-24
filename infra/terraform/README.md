# infra/terraform

Provisions the production S3 bucket, a narrowly-scoped IAM user for this
app's own S3 access (`lib/backup`, `lib/publish`), a CloudFront distribution
in front of the bucket for published artifacts, and a zero-spend budget
alert. See [docs/02-architecture.md](../../docs/02-architecture.md#configuration)
for how the resulting values map to env vars.

## Prerequisites

1. **Don't use root.** Set up IAM Identity Center (`aws configure sso`) for
   your own admin login, or at minimum a dedicated IAM user with MFA — root
   should only ever handle account-level tasks.
2. A working AWS CLI profile with permission to create S3/IAM/Budgets
   resources (e.g. the account's admin role via SSO). Verify with:
   ```
   aws sts get-caller-identity
   ```
3. [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.7.

## Usage

```
cp terraform.tfvars.example terraform.tfvars   # fill in your values — gitignored, never commit it
terraform init
terraform plan
terraform apply
```

Then read the generated credentials once and store them wherever production
secrets actually live (not in this repo):

```
terraform output bucket_name
terraform output -raw s3_access_key_id
terraform output -raw s3_secret_access_key
terraform output cdn_domain_name
terraform output cdn_distribution_id
```

Map these to the app's env vars per [docs/02-architecture.md](../../docs/02-architecture.md#configuration):
`S3_BUCKET`, `AWS_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`CDN_INVALIDATION` (`S3_ENDPOINT` stays unset in production — that's a
MinIO-only local-dev value). `cdn_domain_name` is the public URL the website
switches to (Migration Plan Step 5) — it isn't an app env var.

## CDN

CloudFront sits in front of the bucket via Origin Access Control (OAC), so
the bucket itself stays fully private (`aws_s3_bucket_public_access_block`
in `s3.tf` is untouched) — only CloudFront can read from it, via the bucket
policy in `s3.tf` scoped to this one distribution's ARN. That policy also
carries an explicit `Deny` on the `backups/` prefix: the bucket holds full
production DB backups alongside published artifacts, and those must never
become reachable by URL-guessing through the public CDN.

Deliberately minimal for a small static-JSON site, all free-tier: default
`*.cloudfront.net` domain (no ACM certificate or Route53 zone needed),
`PriceClass_100` (US/Canada/Europe edges only — CloudFront's 1TB / 10M
request monthly free tier applies at any price class), GET/HEAD only, no
WAF, no access logging.

## Cost

Everything here is usage-based with no idle/hourly charge: IAM is always
free, CloudFront's free tier comfortably covers this app's traffic, and the
bucket only costs anything once you're storing/requesting data beyond the
free tier (unlikely at this app's data volume — see the
`budget_alert_email` zero-spend alert, which fires above `budget_limit_usd`
either way as a backstop).
