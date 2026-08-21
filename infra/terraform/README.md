# infra/terraform

Provisions the production S3 bucket and a narrowly-scoped IAM user for this
app's own S3 access (`lib/backup`, `lib/publish`), plus a zero-spend budget
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
```

Map these to the app's env vars per [docs/02-architecture.md](../../docs/02-architecture.md#configuration):
`S3_BUCKET`, `AWS_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
(`S3_ENDPOINT` stays unset in production — that's a MinIO-only local-dev
value).

## Cost

Everything here is usage-based with no idle/hourly charge: IAM is always
free, and the bucket only costs anything once you're storing/requesting
data beyond the free tier (unlikely at this app's data volume — see the
`budget_alert_email` zero-spend alert, which fires above `budget_limit_usd`
either way as a backstop).
