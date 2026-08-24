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

# AWS managed policy ("Managed-CORS-with-preflight") adds
# Access-Control-Allow-Origin: * to every response at the CloudFront layer,
# regardless of caller — not configured as S3 bucket CORS, since that would
# depend on the origin echoing the right headers back through CloudFront.
# A wildcard is deliberate: these are public read-only artifacts (the
# actual access control is the OAC/bucket-policy layer below, which CORS
# doesn't touch), so an origin allowlist would protect nothing while
# requiring upkeep every time a dev port or preview-URL pattern changes.
#
# The "-with-preflight" variant (not the plainer Managed-SimpleCORS) is
# required, not optional: the website's fetch client triggers a real CORS
# preflight (OPTIONS), and only this policy carries the
# Access-Control-Allow-Methods / -Max-Age headers a preflight response
# needs. This policy only adds headers to whatever response comes back,
# though — it does NOT make CloudFront answer OPTIONS itself, so it still
# has to be paired with the function below.
data "aws_cloudfront_response_headers_policy" "cors_with_preflight" {
  name = "Managed-CORS-With-Preflight"
}

# S3 has no bucket-level CORS config of its own, so a forwarded OPTIONS
# preflight reaches S3 and gets a flat 403 back — headers from the response
# headers policy above land on that 403 too, but browsers require the
# preflight response itself to be 2xx, so it still fails. This function
# answers OPTIONS directly at the edge, before the request ever reaches S3;
# the response headers policy still supplies the actual CORS headers on
# top of this 204. CloudFront Functions are free up to 2M invocations/month.
resource "aws_cloudfront_function" "handle_preflight" {
  name    = "warriors-admin-portal-cors-preflight"
  runtime = "cloudfront-js-2.0"
  comment = "Answers CORS preflight (OPTIONS) at the edge, since the S3 origin has no CORS config and would otherwise 403 it"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      if (request.method === "OPTIONS") {
        return { statusCode: 204, statusDescription: "No Content" };
      }
      return request;
    }
  EOT
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
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-published-artifacts"
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.cors_with_preflight.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.handle_preflight.arn
    }
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
