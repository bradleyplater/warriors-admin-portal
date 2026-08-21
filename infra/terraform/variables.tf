variable "aws_region" {
  description = "AWS region for the bucket and its resources."
  type        = string
  default     = "eu-west-2"
}

variable "bucket_name" {
  description = "Name of the S3 bucket used for backups (lib/backup) and publish artifacts (lib/publish). S3 bucket names are globally unique across all AWS accounts."
  type        = string
}

variable "backup_retention_days" {
  description = "Days to keep objects under the backups/ prefix before they're automatically deleted. Keeps storage — and therefore cost — bounded as backups accumulate. Set to 0 to disable and keep backups forever."
  type        = number
  default     = 90
}

variable "budget_limit_usd" {
  description = "Monthly USD spend that triggers the zero-spend budget alert email."
  type        = string
  default     = "1"
}

variable "budget_alert_email" {
  description = "Email address to notify when actual spend crosses budget_limit_usd. Set this in a local terraform.tfvars (gitignored) — not committed, since it's personal contact info."
  type        = string
}
