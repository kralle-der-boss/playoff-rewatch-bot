variable "name" { type = string }
variable "region" { type = string }
variable "telegram_bot_token" { type = string, sensitive = true }
variable "db_path" { type = string, default = "/data/app.db" }
variable "desired_count" { type = number, default = 1 }
variable "cpu" { type = number, default = 256 }
variable "memory" { type = number, default = 512 }
variable "container_port" { type = number, default = 3000 }
variable "image_tag" { type = string, default = "latest" }
variable "vpc_cidr" { type = string, default = "10.42.0.0/16" }
variable "public_subnet_cidrs" { type = list(string), default = ["10.42.1.0/24", "10.42.2.0/24"] }
