provider "aws" {
  region = "ap-northeast-1"
}

# S3バケットの作成
resource "aws_s3_bucket" "todo_app" {
  bucket = "todo-app-bucket-2025"
}

# バケットのパブリックアクセスをブロック
resource "aws_s3_bucket_public_access_block" "todo_app" {
  bucket = aws_s3_bucket.todo_app.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3バケットのACL設定
resource "aws_s3_bucket_ownership_controls" "todo_app" {
  bucket = aws_s3_bucket.todo_app.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# CloudFront OAC (Origin Access Control) 設定
resource "aws_cloudfront_origin_access_control" "todo_app" {
  name                              = "todo-app-oac-2025"
  description                       = "OAC for Todo App S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFrontディストリビューション
resource "aws_cloudfront_distribution" "todo_app" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # 米国、カナダ、欧州のみ - コスト削減のため

  origin {
    domain_name              = aws_s3_bucket.todo_app.bucket_regional_domain_name
    origin_id                = "todoAppS3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.todo_app.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "todoAppS3Origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # SPA対応 - 404エラーを index.html にリダイレクト
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # SPAルーティング対応 - 403エラーもindex.htmlにリダイレクト
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # カスタムドメインを設定する場合はこちらを使用
  # viewer_certificate {
  #   acm_certificate_arn      = "YOUR_ACM_CERTIFICATE_ARN"
  #   ssl_support_method       = "sni-only"
  #   minimum_protocol_version = "TLSv1.2_2021"
  # }
}

# S3バケットポリシー - CloudFrontからのアクセスのみを許可
resource "aws_s3_bucket_policy" "todo_app" {
  bucket = aws_s3_bucket.todo_app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.todo_app.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.todo_app.arn
          }
        }
      }
    ]
  })
}

# Webサイトホスティング設定
resource "aws_s3_bucket_website_configuration" "todo_app" {
  bucket = aws_s3_bucket.todo_app.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# 出力値
output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.todo_app.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.todo_app.domain_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.todo_app.id
}
