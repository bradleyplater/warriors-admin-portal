output "bucket_name" {
  description = "Value for the app's S3_BUCKET env var."
  value       = aws_s3_bucket.app.bucket
}

output "aws_region" {
  description = "Value for the app's AWS_REGION env var."
  value       = var.aws_region
}

output "s3_access_key_id" {
  description = "Value for the app's S3_ACCESS_KEY_ID env var."
  value       = aws_iam_access_key.app.id
}

output "s3_secret_access_key" {
  description = "Value for the app's S3_SECRET_ACCESS_KEY env var. Sensitive — never printed by default; run `terraform output -raw s3_secret_access_key` to read it once and paste it straight into wherever you're storing production secrets."
  value       = aws_iam_access_key.app.secret
  sensitive   = true
}

output "cdn_domain_name" {
  description = "Public CloudFront URL serving the published JSON artifacts (the S3/CDN URL the website switches to — docs/04-migration-plan.md Step 5)."
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "cdn_distribution_id" {
  description = "Value for the app's CDN_INVALIDATION env var."
  value       = aws_cloudfront_distribution.app.id
}
