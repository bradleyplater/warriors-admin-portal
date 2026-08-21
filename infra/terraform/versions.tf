terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state on purpose: this is a single-operator project and a remote
  # backend (S3 + DynamoDB) would itself cost a little and add a
  # bootstrapping problem (needing a bucket before this creates one).
  # infra/terraform/terraform.tfstate is gitignored — never commit it, it
  # contains the IAM user's secret access key in plaintext.
}

provider "aws" {
  region = var.aws_region
}
