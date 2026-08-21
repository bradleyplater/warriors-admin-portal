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
