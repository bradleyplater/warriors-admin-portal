# Zero-spend safety net: nothing in this stack should ever cost real money
# (IAM is free; this bucket is tiny and usage-based), so any actual spend
# above budget_limit_usd means something unexpected got provisioned.
resource "aws_budgets_budget" "zero_spend" {
  name         = "warriors-admin-portal-zero-spend"
  budget_type  = "COST"
  limit_amount = var.budget_limit_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
