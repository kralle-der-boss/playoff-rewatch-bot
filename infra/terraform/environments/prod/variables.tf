variable "aws_region" { type = string }
variable "name" { type = string }
variable "telegram_bot_token" { type = string, sensitive = true }
variable "image_tag" { type = string, default = "latest" }
variable "desired_count" { type = number, default = 1 }
