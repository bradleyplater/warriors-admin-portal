# CDN in front of the (still fully private) app bucket, so the website can
# be pointed at a public CDN URL (docs/04-migration-plan.md Step 5) without
# opening the bucket itself to the internet. Origin Access Control (OAC) is
# the current AWS-recommended pattern — CloudFront authenticates to S3 with
# a signed request rather than the bucket needing any public grant, so this
# coexists with aws_s3_bucket_public_access_block in s3.tf staying fully on.
resource "aws_cloudfront_origin_access_control" "app" {
  name                              = "warriors-admin-portal-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# AWS managed policy ("Managed-CachingOptimized") rather than a bespoke one —
# these are static JSON artifacts with no cookies/query-string variation, so
# the standard optimized-caching defaults are exactly right.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "app" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Warriors Admin Portal - published JSON artifacts"

  # US/Canada/Europe edge locations only — the cheapest class. CloudFront's
  # 1TB / 10M-request monthly free tier applies regardless of price class,
  # and this app's audience doesn't need edges beyond these regions.
  price_class = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.app.bucket_regional_domain_name
    origin_id                = "s3-published-artifacts"
    origin_access_control_id = aws_cloudfront_origin_access_control.app.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-published-artifacts"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Default *.cloudfront.net domain — no custom domain, so no ACM
  # certificate (which would need to live in us-east-1) or Route53 zone.
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
