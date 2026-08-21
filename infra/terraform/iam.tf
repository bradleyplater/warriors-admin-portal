# Dedicated to the app's own S3 access (lib/backup, lib/publish) — never
# your personal admin login. Scoped to exactly this bucket, nothing else.
resource "aws_iam_user" "app" {
  name = "warriors-admin-portal-app"
}

resource "aws_iam_user_policy" "app_bucket_access" {
  name = "warriors-admin-portal-bucket-access"
  user = aws_iam_user.app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # s3:HeadBucket is a distinct action from s3:ListBucket (confirmed
        # via `aws iam simulate-principal-policy` — AWS treats them as
        # needing different authorization info) and is what GET /api/health
        # calls via HeadBucketCommand to verify connectivity without
        # reading/listing objects.
        Sid      = "ListBucket"
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:HeadBucket"]
        Resource = [aws_s3_bucket.app.arn]
      },
      {
        # No s3:DeleteObject: the app only ever reads/writes objects
        # (backup, restore, publish). Expiring old backups is handled by
        # the bucket's own lifecycle rule, which needs no user permission.
        Sid      = "ReadWriteObjects"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = ["${aws_s3_bucket.app.arn}/*"]
      }
    ]
  })
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}
