# One bucket for both lib/backup (backups/<timestamp>/ prefix) and
# lib/publish (published JSON artifacts) — the app already targets both
# through the single S3_BUCKET env var (lib/s3.ts).
resource "aws_s3_bucket" "app" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "app" {
  bucket = aws_s3_bucket.app.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# SSE-S3 (AES256) — free, no KMS request charges.
resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning is deliberately left off: backups are already timestamped,
# non-overwriting objects, and turning this on would keep every historical
# copy of overwritten publish artifacts around indefinitely, growing
# storage (and cost) for little benefit here.
resource "aws_s3_bucket_versioning" "app" {
  bucket = aws_s3_bucket.app.id
  versioning_configuration {
    status = "Disabled"
  }
}

# Bounds storage growth from repeated npm run backup:run so this stays
# inside the free tier / near-zero cost long-term.
resource "aws_s3_bucket_lifecycle_configuration" "app" {
  count  = var.backup_retention_days > 0 ? 1 : 0
  bucket = aws_s3_bucket.app.id

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    filter {
      prefix = "backups/"
    }

    expiration {
      days = var.backup_retention_days
    }
  }
}

# Lets the CloudFront distribution (infra/terraform/cloudfront.tf) read
# objects via OAC — scoped to that one distribution's ARN, so no other
# CloudFront distribution in the account could use this grant even if it
# tried. block_public_policy above only blocks policies that grant access
# to everyone; a policy scoped to a specific AWS service + SourceArn isn't
# "public" by AWS's own definition, so this coexists with it.
#
# backups/ holds full production DB dumps and must never be reachable by
# URL-guessing through the CDN, so it gets an explicit Deny — belt and
# suspenders on top of the Allow only ever granting the other prefixes.
resource "aws_s3_bucket_policy" "cdn_read" {
  bucket = aws_s3_bucket.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.app.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.app.arn
          }
        }
      },
      {
        Sid       = "DenyCloudFrontOnBackups"
        Effect    = "Deny"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.app.arn}/backups/*"
      }
    ]
  })
}
